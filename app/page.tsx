import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { RestaurantInfo } from "@/components/RestaurantInfo";
import { deensBistro } from "@/lib/data/deens-bistro";
import { getHours } from "@/lib/store/hours";
import { getMenuItems } from "@/lib/store/menu";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const restaurant = {
    ...deensBistro,
    menu_items: getMenuItems(),
    hours: getHours(),
  };
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-lg font-bold text-amber-700">TableTalk AI</p>
            <p className="text-xs text-stone-500">MVP · Mock data</p>
          </div>
          <div className="flex gap-2">
            <Link href="/chat">
              <Button size="sm">Try Chat</Button>
            </Link>
            <Link href="/orders">
              <Button variant="secondary" size="sm">
                Orders
              </Button>
            </Link>
            <Link href="/menu">
              <Button variant="secondary" size="sm">
                Menu
              </Button>
            </Link>
            <Link href="/leads">
              <Button variant="secondary" size="sm">
                Leads
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-stone-900">
            {restaurant.name}
          </h1>
          <p className="mt-2 text-stone-600">
            AI phone assistant demo — place pickup orders, ask questions, or
            inquire about catering and large events.
          </p>
          <Link href="/chat" className="mt-4 inline-block">
            <Button>Open Chat Simulator</Button>
          </Link>
        </div>

        <RestaurantInfo restaurant={restaurant} />
      </main>
    </div>
  );
}
