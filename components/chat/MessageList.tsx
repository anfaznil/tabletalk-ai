import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "@/types";

export function MessageList({
  messages,
  loading,
  logoUrl,
}: {
  messages: ChatMessage[];
  loading: boolean;
  logoUrl?: string | null;
}) {
  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          role={msg.role}
          content={msg.content}
          logoUrl={logoUrl}
        />
      ))}
      {loading && (
        <div className="flex items-end justify-start gap-2">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full border border-stone-200 object-cover"
            />
          )}
          <div className="rounded-2xl bg-stone-100 px-4 py-2 text-sm text-stone-500">
            Typing...
          </div>
        </div>
      )}
    </div>
  );
}
