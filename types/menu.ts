export type MenuItemAvailability =
  | "in_stock"
  | "sold_out_today"
  | "sold_out_indefinitely";

export const MENU_ITEM_AVAILABILITY_LABELS: Record<
  MenuItemAvailability,
  string
> = {
  in_stock: "In stock",
  sold_out_today: "Sold out today",
  sold_out_indefinitely: "Sold out indefinitely",
};

export function isMenuItemOrderable(
  availability: MenuItemAvailability | undefined
): boolean {
  return (availability ?? "in_stock") === "in_stock";
}

export function menuItemAvailabilityLabel(
  availability: MenuItemAvailability | undefined
): string {
  return MENU_ITEM_AVAILABILITY_LABELS[availability ?? "in_stock"];
}
