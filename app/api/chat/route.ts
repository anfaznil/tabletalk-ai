import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildRestaurantContext } from "@/lib/ai/context";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { aiTools } from "@/lib/ai/tools";
import { handleToolCall } from "@/lib/ai/handlers";
import type { ChatMessage } from "@/types";

// Convert OpenAI-style tool definitions to Anthropic's input_schema format.
const anthropicTools: Anthropic.Tool[] = aiTools.map((t) => ({
  name: t.function.name,
  description: t.function.description,
  input_schema: t.function.parameters as Anthropic.Tool["input_schema"],
}));

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.startsWith("your")) {
      return NextResponse.json(
        {
          error:
            "Anthropic API key not configured. Add a valid ANTHROPIC_API_KEY to .env.local and restart the dev server.",
        },
        { status: 503 }
      );
    }

    const client = new Anthropic({ apiKey });
    const context = await buildRestaurantContext();
    const systemPrompt = buildSystemPrompt(context);

    // Build the initial message list in Anthropic format.
    let anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Agentic loop — keep running until the model returns end_turn (no more tool calls).
    let finalText = "";
    for (;;) {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        system: systemPrompt,
        messages: anthropicMessages,
        tools: anthropicTools,
        max_tokens: 1024,
      });

      // Collect any text content from this turn.
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      if (textBlocks.length) {
        finalText = textBlocks.map((b) => b.text).join("");
      }

      if (response.stop_reason !== "tool_use") break;

      // Execute every tool call in this response.
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      // Append the assistant turn (which includes tool_use blocks).
      anthropicMessages = [
        ...anthropicMessages,
        { role: "assistant", content: response.content },
      ];

      // Build a single user message with all tool results.
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const result = await handleToolCall(
            block.name,
            block.input as Record<string, unknown>
          );
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: result.message,
          };
        })
      );

      anthropicMessages = [
        ...anthropicMessages,
        { role: "user", content: toolResults },
      ];
    }

    if (!finalText) {
      finalText = "What can I get for you?";
    }

    return NextResponse.json({ content: finalText });
  } catch (err) {
    console.error("Chat API error:", err);

    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        return NextResponse.json(
          {
            error:
              "Invalid Anthropic API key. Update ANTHROPIC_API_KEY in .env.local with a real key from console.anthropic.com, then restart the dev server.",
          },
          { status: 401 }
        );
      }
      if (err.status === 429) {
        return NextResponse.json(
          {
            error:
              "Anthropic rate limit hit. Check your plan at console.anthropic.com and try again.",
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: err.message || "Anthropic request failed." },
        { status: err.status ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
