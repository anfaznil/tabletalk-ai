import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildRestaurantContext } from "@/lib/ai/context";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { aiTools } from "@/lib/ai/tools";
import { handleToolCall } from "@/lib/ai/handlers";
import type { ChatMessage } from "@/types";

function isFunctionToolCall(
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
): toolCall is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & {
  function: { name: string; arguments: string };
} {
  return "function" in toolCall && toolCall.type === "function";
}

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes("your_openai") || apiKey.includes("your-key")) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key not configured. Add a valid OPENAI_API_KEY to .env.local and restart the dev server.",
        },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey });
    const context = buildRestaurantContext();
    const systemPrompt = buildSystemPrompt(context);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      tools: aiTools,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    let content = choice.message.content ?? "";

    if (choice.message.tool_calls?.length) {
      const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        choice.message,
      ];

      for (const toolCall of choice.message.tool_calls) {
        if (!isFunctionToolCall(toolCall)) continue;

        const args = JSON.parse(toolCall.function.arguments);
        const result = handleToolCall(toolCall.function.name, args);

        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.message,
        });
      }

      const followUp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: toolMessages,
      });

      content =
        followUp.choices[0]?.message?.content ?? "Got it.";
    }

    if (!content) {
      content = "What can I get for you?";
    }

    return NextResponse.json({ content });
  } catch (err) {
    console.error("Chat API error:", err);

    if (err instanceof OpenAI.APIError) {
      if (err.status === 401) {
        return NextResponse.json(
          {
            error:
              "Invalid OpenAI API key. Update OPENAI_API_KEY in .env.local with a real key from platform.openai.com, then restart the dev server.",
          },
          { status: 401 }
        );
      }
      if (err.status === 429) {
        return NextResponse.json(
          {
            error:
              "OpenAI quota exceeded. Add a payment method or credits at platform.openai.com/account/billing, then try again.",
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: err.message || "OpenAI request failed." },
        { status: err.status ?? 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
