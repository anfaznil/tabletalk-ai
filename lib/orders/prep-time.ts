import type { MenuItem } from "@/lib/data/deens-bistro";
import type { OrderItemInput } from "@/lib/orders/validate";

/**
 * Order prep time = longest single-item prep time in the order.
 * Items cook in parallel — a 10-min platter + 5-min burger = 10 min,
 * but a 10-min platter + 20-min fried chicken = 20 min.
 */
export function calculateOrderPrepMinutes(
  inputs: OrderItemInput[],
  menuItems: MenuItem[]
): number {
  const menuMap = new Map(menuItems.map((m) => [m.id, m]));
  let maxPrep = 0;

  for (const input of inputs) {
    const menuItem = menuMap.get(input.menu_item_id);
    if (!menuItem) continue;
    maxPrep = Math.max(maxPrep, menuItem.prep_time_minutes);
  }

  return maxPrep;
}

export function formatReadyTime(prepMinutes: number, from: Date = new Date()): string {
  const ready = new Date(from.getTime() + prepMinutes * 60_000);
  return ready.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
