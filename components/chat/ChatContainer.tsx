"use client";

import { useState } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import type { ChatMessage } from "@/types";

export function ChatContainer({
  restaurantName,
  logoUrl,
}: {
  restaurantName: string;
  logoUrl?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi, this is ${restaurantName}.`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(content: string) {
    const userMessage: ChatMessage = { role: "user", content };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      let data: { content?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(
          res.ok
            ? "Unexpected response from server."
            : `Server error (${res.status}). Is the dev server running?`
        );
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      if (data.content) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content! },
        ]);
      }
    } catch {
      setError(
        "Failed to reach the assistant. Make sure npm run dev is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} loading={loading} logoUrl={logoUrl} />
      {error && (
        <p className="px-4 pb-2 text-sm text-red-600">{error}</p>
      )}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
