import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "@/types";

export function MessageList({
  messages,
  loading,
}: {
  messages: ChatMessage[];
  loading: boolean;
}) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((msg, i) => (
        <MessageBubble key={i} role={msg.role} content={msg.content} />
      ))}
      {loading && (
        <div className="flex justify-start">
          <div className="rounded-2xl bg-stone-100 px-4 py-2 text-sm text-stone-500">
            Typing...
          </div>
        </div>
      )}
    </div>
  );
}
