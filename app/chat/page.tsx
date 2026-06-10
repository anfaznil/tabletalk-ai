import Link from "next/link";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { deensBistro } from "@/lib/data/deens-bistro";
import { Button } from "@/components/ui/Button";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-screen max-w-lg flex-col bg-white">
      <header className="border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/menu">
            <Button variant="ghost" size="sm">
              ← Menu
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-semibold text-stone-900">
              Chat Simulator
            </h1>
            <p className="text-xs text-stone-500">{deensBistro.name}</p>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Exit
            </Button>
          </Link>
        </div>
      </header>
      <ChatContainer restaurantName={deensBistro.name} />
    </div>
  );
}
