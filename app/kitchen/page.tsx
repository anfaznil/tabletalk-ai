import { getOrders } from "@/lib/store/orders";
import { KitchenBoard } from "@/app/kitchen/KitchenBoard";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const orders = await getOrders();
  return <KitchenBoard initialOrders={orders} />;
}
