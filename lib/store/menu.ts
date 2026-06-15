import { deensBistro, type MenuItem } from "@/lib/data/deens-bistro";
import type { MenuItemAvailability } from "@/types/menu";
import { loadPersisted, savePersisted } from "@/lib/store/persist";

const globalStore = globalThis as unknown as { menuItems: MenuItem[] };

const VALID_AVAILABILITY: MenuItemAvailability[] = [
  "in_stock",
  "sold_out_today",
  "sold_out_indefinitely",
];

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function applySoldOutTodayReset(item: MenuItem): MenuItem {
  if (item.availability !== "sold_out_today") {
    if (!item.sold_out_today_on) return item;
    const { sold_out_today_on: _removed, ...rest } = item;
    return rest;
  }

  const today = getLocalDateKey();
  const markedOn = item.sold_out_today_on ?? today;

  if (!item.sold_out_today_on) {
    return { ...item, sold_out_today_on: today };
  }

  if (markedOn < today) {
    const { sold_out_today_on: _removed, ...rest } = item;
    return { ...rest, availability: "in_stock" };
  }

  return item;
}

function normalizeMenuItem(item: MenuItem): MenuItem {
  const availability = VALID_AVAILABILITY.includes(
    item.availability as MenuItemAvailability
  )
    ? (item.availability as MenuItemAvailability)
    : "in_stock";

  return applySoldOutTodayReset({
    ...item,
    availability,
    sort_order:
      typeof item.sort_order === "number" && Number.isFinite(item.sort_order)
        ? item.sort_order
        : 0,
  });
}

function ensureMenuItemDefaults(): void {
  const normalized = globalStore.menuItems.map(normalizeMenuItem);
  const availabilityChanged = normalized.some(
    (item, index) =>
      item.availability !== globalStore.menuItems[index]?.availability ||
      item.sold_out_today_on !== globalStore.menuItems[index]?.sold_out_today_on
  );
  globalStore.menuItems = normalized;

  const byCategory = new Map<string, MenuItem[]>();
  for (const item of globalStore.menuItems) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  let changed = false;
  for (const items of byCategory.values()) {
    items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    items.forEach((item, index) => {
      if (item.sort_order !== index) {
        item.sort_order = index;
        changed = true;
      }
    });
  }

  if (changed || availabilityChanged) persist();
}

if (!globalStore.menuItems) {
  globalStore.menuItems = loadPersisted("menuItems", () =>
    deensBistro.menu_items.map((item, index) =>
      normalizeMenuItem({
        ...item,
        availability: "in_stock",
        sort_order: index,
      })
    )
  );
  ensureMenuItemDefaults();
}

function persist() {
  savePersisted("menuItems", globalStore.menuItems);
}

function nextSortOrder(category: string): number {
  const inCategory = globalStore.menuItems.filter(
    (item) => item.category.toLowerCase() === category.toLowerCase()
  );
  if (!inCategory.length) return 0;
  return Math.max(...inCategory.map((item) => item.sort_order ?? 0)) + 1;
}

export function getMenuItems(): MenuItem[] {
  ensureMenuItemDefaults();
  return globalStore.menuItems;
}

export function getMenuItem(id: string): MenuItem | undefined {
  return getMenuItems().find((item) => item.id === id);
}

export function updateMenuItem(
  id: string,
  updates: Partial<Omit<MenuItem, "id">>
): MenuItem | null {
  const index = globalStore.menuItems.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const nextAvailability =
    updates.availability !== undefined
      ? VALID_AVAILABILITY.includes(updates.availability)
        ? updates.availability
        : globalStore.menuItems[index].availability
      : undefined;

  let soldOutTodayOn = globalStore.menuItems[index].sold_out_today_on;
  if (nextAvailability === "sold_out_today") {
    soldOutTodayOn = getLocalDateKey();
  } else if (
    nextAvailability === "in_stock" ||
    nextAvailability === "sold_out_indefinitely"
  ) {
    soldOutTodayOn = undefined;
  }

  globalStore.menuItems[index] = {
    ...globalStore.menuItems[index],
    ...updates,
    availability: nextAvailability ?? globalStore.menuItems[index].availability,
    sold_out_today_on: soldOutTodayOn,
    prep_time_minutes:
      updates.prep_time_minutes !== undefined
        ? Math.max(0, updates.prep_time_minutes)
        : globalStore.menuItems[index].prep_time_minutes,
    price:
      updates.price !== undefined
        ? Math.max(0, updates.price)
        : globalStore.menuItems[index].price,
    sort_order:
      updates.sort_order !== undefined
        ? Math.max(0, updates.sort_order)
        : globalStore.menuItems[index].sort_order,
  };

  persist();
  return globalStore.menuItems[index];
}

export function addMenuItem(item: Omit<MenuItem, "id">): MenuItem {
  const category = item.category ?? "General";
  const newItem: MenuItem = {
    ...item,
    id: `menu-${crypto.randomUUID().slice(0, 8)}`,
    category,
    availability: item.availability ?? "in_stock",
    sort_order:
      item.sort_order !== undefined ? item.sort_order : nextSortOrder(category),
    prep_time_minutes: Math.max(0, item.prep_time_minutes),
    price: Math.max(0, item.price),
  };
  globalStore.menuItems.push(newItem);
  persist();
  return newItem;
}

/** Moves all items in one category to another (used when renaming categories). */
export function renameMenuItemsCategory(from: string, to: string): void {
  let changed = false;
  for (const item of globalStore.menuItems) {
    if (item.category.toLowerCase() === from.toLowerCase()) {
      item.category = to;
      changed = true;
    }
  }
  if (changed) {
    ensureMenuItemDefaults();
    persist();
  }
}

export function reorderMenuItemsInCategory(
  category: string,
  orderedIds: string[]
): { error?: string } {
  const categoryItems = globalStore.menuItems.filter(
    (item) => item.category.toLowerCase() === category.toLowerCase()
  );

  if (orderedIds.length !== categoryItems.length) {
    return { error: "Invalid item order" };
  }

  const categoryIdSet = new Set(categoryItems.map((item) => item.id));
  if (!orderedIds.every((id) => categoryIdSet.has(id))) {
    return { error: "Invalid item order" };
  }

  orderedIds.forEach((id, index) => {
    const item = globalStore.menuItems.find((entry) => entry.id === id);
    if (item) item.sort_order = index;
  });

  persist();
  return {};
}

export function deleteMenuItem(id: string): boolean {
  const index = globalStore.menuItems.findIndex((item) => item.id === id);
  if (index === -1) return false;

  globalStore.menuItems.splice(index, 1);
  ensureMenuItemDefaults();
  persist();
  return true;
}
