import { ChatContainer } from "@/components/chat/ChatContainer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getStoreInfo } from "@/lib/store/info";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  const info = getStoreInfo();

  return (
    <DashboardLayout fullHeight>
      <div className="border-b border-stone-200 px-8 py-4">
        <h1 className="text-lg font-semibold text-stone-900">Chat Simulator</h1>
        <p className="text-sm text-stone-500">{info.name}</p>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <ChatContainer
          restaurantName={info.name}
          logoUrl={info.logo_data_url}
        />
      </div>
    </DashboardLayout>
  );
}
