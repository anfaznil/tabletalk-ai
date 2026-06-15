import type { MenuItem } from "@/lib/data/deens-bistro";
import {
  customizationAppliesTo,
  getCustomization,
} from "@/lib/store/customizations";
import { isMenuItemOrderable } from "@/types/menu";
import type { OrderItem, OrderSize } from "@/types/orders";

export const LARGE_ORDER_THRESHOLD = 300;

export interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  notes?: string;
  customization_ids?: string[];
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

    if (!isMenuItemOrderable(menuItem.availability)) {
      const reason =
        menuItem.availability === "sold_out_today"
          ? "sold out for today"
          : "sold out";
      throw new Error(`${menuItem.name} is ${reason}.`);
    }

    const customizations = [];
    const customizationIds = input.customization_ids ?? [];
    const seenIds = new Set<string>();

    for (const customizationId of customizationIds) {
      if (seenIds.has(customizationId)) continue;
      seenIds.add(customizationId);

      const customization = getCustomization(customizationId);
      if (!customization) {
        throw new Error(`Unknown customization: ${customizationId}`);
      }
      if (!customizationAppliesTo(customization, menuItem.id)) {
        throw new Error(
          `"${customization.name}" is not available on ${menuItem.name}`
        );
      }

      customizations.push({
        id: customization.id,
        name: customization.name,
        price_modifier: customization.price_modifier,
      });
    }

    const modifierPerUnit = customizations.reduce(
      (sum, c) => sum + c.price_modifier,
      0
    );
    const line_total = (menuItem.price + modifierPerUnit) * input.quantity;

    items.push({
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      quantity: input.quantity,
      unit_price: menuItem.price,
      line_total,
      customizations,
      notes: input.notes ?? null,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
  return { items, subtotal };
}
