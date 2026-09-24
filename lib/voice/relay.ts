/**
 * ConversationRelay WebSocket handler.
 * Called once per WebSocket connection from Twilio.
 *
 * Twilio → us messages:
 *   { type: "setup",   callSid, ... }           — first message after connect
 *   { type: "prompt",  voicePrompt: string }     — transcribed customer speech
 *   { type: "interrupt" }                        — customer interrupted
 *   { type: "dtmf",    digit: string }           — keypad digit
 *
 * us → Twilio messages:
 *   { type: "text", token: string, last: boolean }  — TTS text (streamed tokens)
 *   { type: "transferCall", to: string, statusCallbackUrl: string }
 *   { type: "end" }                                 — end the call
 */

import type { WebSocket } from "ws";
import Anthropic from "@anthropic-ai/sdk";
import { buildRestaurantContext } from "@/lib/ai/context";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { aiTools } from "@/lib/ai/tools";
import { handleToolCall } from "@/lib/ai/handlers";
import { createSession, getSession, deleteSession } from "@/lib/voice/session";

const anthropicTools: Anthropic.Tool[] = aiTools.map((t) => ({
  name: t.function.name,
  description: t.function.description,
  input_schema: t.function.parameters as Anthropic.Tool["input_schema"],
}));

const TRANSFER_NUMBER = process.env.TWILIO_TRANSFER_NUMBER ?? "";

function send(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify(payload));
  }
}

/** Send the AI reply back as streamed text tokens (simulated — Anthropic non-streaming for now). */
function sendReply(ws: WebSocket, text: string): void {
  // Split into ~word-sized tokens so Twilio's TTS starts playing faster.
  const words = text.split(/(\s+)/);
  for (let i = 0; i < words.length; i++) {
    send(ws, { type: "text", token: words[i], last: i === words.length - 1 });
  }
}

async function getAiReply(
  callSid: string,
  userText: string,
  transferFailed: boolean,
  statusCallbackBase: string
): Promise<void> {
  const session = getSession(callSid);
  if (!session) return;

  session.messages.push({ role: "user", content: userText });

  const context = await buildRestaurantContext();
  const basePrompt = buildSystemPrompt(context);
  const systemPrompt = transferFailed
    ? basePrompt +
      "\n\nNOTE: A transfer was just attempted but the staff line was not answered. Acknowledge naturally — e.g. \"Looks like nobody's picking up — I can still help you.\" Continue assisting. Offer to take a message if they'd like."
    : basePrompt;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let messages = [...session.messages];
  let finalText = "";
  let transferTo: string | undefined;

  for (;;) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      system: systemPrompt,
      messages,
      tools: anthropicTools,
      max_tokens: 512,
    });

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    if (textBlocks.length) finalText = textBlocks.map((b) => b.text).join("");

    if (response.stop_reason !== "tool_use") break;

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    messages = [...messages, { role: "assistant", content: response.content }];

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => {
        if (block.name === "transfer_to_staff") {
          if (TRANSFER_NUMBER) transferTo = TRANSFER_NUMBER;
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: TRANSFER_NUMBER
              ? JSON.stringify({ success: true, message: "Transferring to staff now." })
              : JSON.stringify({ success: false, message: "No transfer number is configured." }),
          };
        }
        const result = await handleToolCall(block.name, block.input as Record<string, unknown>);
        return { type: "tool_result" as const, tool_use_id: block.id, content: result.message };
      })
    );

    messages = [...messages, { role: "user", content: toolResults }];
  }

  // Save completed exchange.
  session.messages = messages;
  if (finalText) session.messages.push({ role: "assistant", content: finalText });

  return { reply: finalText || "What else can I help you with?", transferTo } as unknown as void;
}

export function handleRelayConnection(ws: WebSocket, url: URL): void {
  let callSid = "";
  const transferFailed = url.searchParams.get("transfer_failed") === "1";
  const statusCallbackBase = `${url.protocol === "wss:" ? "https" : "http"}://${url.host}`;

  ws.on("message", async (raw: Buffer | string) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString()) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = msg.type as string;

    if (type === "setup") {
      callSid = (msg.callSid as string) ?? "";
      // Session may already exist (created by the incoming webhook); create if not.
      if (!getSession(callSid)) {
        createSession(callSid, undefined, "unknown");
      }
      const session = getSession(callSid)!;
      if (transferFailed) session.transferFailed = true;
      return;
    }

    if (type === "interrupt") return; // Twilio handles barge-in; nothing to do server-side.

    if (type === "prompt") {
      const voicePrompt = (msg.voicePrompt as string) ?? "";
      if (!voicePrompt.trim()) return;

      const session = getSession(callSid);
      const failed = session?.transferFailed ?? false;

      // Run the AI agentic loop.
      const result = await (async () => {
        if (!getSession(callSid)) return { reply: "Sorry, something went wrong.", transferTo: undefined };
        const context = await buildRestaurantContext();
        const basePrompt = buildSystemPrompt(context);
        const systemPrompt = failed
          ? basePrompt + "\n\nNOTE: A transfer was attempted but staff didn't answer. Acknowledge naturally and continue helping. Offer to take a message."
          : basePrompt;

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const sess = getSession(callSid)!;
        sess.messages.push({ role: "user", content: voicePrompt });
        let messages = [...sess.messages];
        let finalText = "";
        let transferTo: string | undefined;

        for (;;) {
          const response = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            system: systemPrompt,
            messages,
            tools: anthropicTools,
            max_tokens: 512,
          });

          const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
          if (textBlocks.length) finalText = textBlocks.map((b) => b.text).join("");

          if (response.stop_reason !== "tool_use") break;

          const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
          messages = [...messages, { role: "assistant", content: response.content }];

          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (block) => {
              if (block.name === "transfer_to_staff") {
                if (TRANSFER_NUMBER) transferTo = TRANSFER_NUMBER;
                return {
                  type: "tool_result" as const,
                  tool_use_id: block.id,
                  content: TRANSFER_NUMBER
                    ? JSON.stringify({ success: true, message: "Transferring to staff." })
                    : JSON.stringify({ success: false, message: "No transfer number configured." }),
                };
              }
              const result = await handleToolCall(block.name, block.input as Record<string, unknown>);
              return { type: "tool_result" as const, tool_use_id: block.id, content: result.message };
            })
          );

          messages = [...messages, { role: "user", content: toolResults }];
        }

        sess.messages = messages;
        if (finalText) sess.messages.push({ role: "assistant", content: finalText });
        return { reply: finalText || "What else can I help you with?", transferTo };
      })();

      if (result.transferTo) {
        // Speak the pre-transfer line, then instruct Twilio to dial.
        sendReply(ws, result.reply);
        send(ws, {
          type: "transferCall",
          to: result.transferTo,
          statusCallbackUrl: `${statusCallbackBase}/api/voice/transfer-status?callSid=${encodeURIComponent(callSid)}`,
        });
      } else {
        sendReply(ws, result.reply);
      }
    }
  });

  ws.on("close", () => {
    if (callSid) deleteSession(callSid);
  });

  ws.on("error", (err) => {
    console.error(`[voice] WebSocket error for ${callSid}:`, err);
  });
}
