import type { MenuItem } from "@/lib/data/deens-bistro";
import type { OrderItem, OrderSize } from "@/lib/store/orders";

export const LARGE_ORDER_THRESHOLD = 300;

export interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  notes?: string;
}

export function classifyOrderSize(subtotal: number): OrderSize {
  return subtotal > LARGE_ORDER_THRESHOLD ? "large" : "small";
}

export function validateOrderItems(
  inputs: OrderItemInput[],
  menuItems: MenuItem[]
): { items: OrderItem[]; subtotal: number } {
  const menuMap = new Map(menuItems.map((m) => [m.id, m]));
  const items: OrderItem[] = [];

  for (const input of inputs) {
    const menuItem = menuMap.get(input.menu_item_id);
    if (!menuItem) {
      throw new Error(`Unknown menu item: ${input.menu_item_id}`);
    }
    if (input.quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    const line_total = menuItem.price * input.quantity;
    items.push({
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      quantity: input.quantity,
      unit_price: menuItem.price,
      line_total,
      notes: input.notes ?? null,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
  return { items, subtotal };
}
