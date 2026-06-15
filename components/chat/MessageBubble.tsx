export function MessageBubble({
  role,
  content,
  logoUrl,
}: {
  role: "user" | "assistant";
  content: string;
  logoUrl?: string | null;
}) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-7 w-7 shrink-0 rounded-full border border-stone-200 object-cover"
        />
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? "bg-teal-600 text-white"
            : "bg-stone-100 text-stone-800"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
