import { deensBistro, type MenuItem } from "@/lib/data/deens-bistro";

const globalStore = globalThis as unknown as { menuItems: MenuItem[] };

function seedMenu(): MenuItem[] {
  return deensBistro.menu_items.map((item) => ({ ...item }));
}

if (!globalStore.menuItems) {
  globalStore.menuItems = seedMenu();
}

function syncNewMenuItems() {
  const existingIds = new Set(globalStore.menuItems.map((i) => i.id));
  for (const item of deensBistro.menu_items) {
    if (!existingIds.has(item.id)) {
      globalStore.menuItems.push({ ...item });
    }
  }
}

export function getMenuItems(): MenuItem[] {
  syncNewMenuItems();
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

  globalStore.menuItems[index] = {
    ...globalStore.menuItems[index],
    ...updates,
    prep_time_minutes:
      updates.prep_time_minutes !== undefined
        ? Math.max(0, updates.prep_time_minutes)
        : globalStore.menuItems[index].prep_time_minutes,
    price:
      updates.price !== undefined
        ? Math.max(0, updates.price)
        : globalStore.menuItems[index].price,
  };

  return globalStore.menuItems[index];
}

export function addMenuItem(
  item: Omit<MenuItem, "id">
): MenuItem {
  const newItem: MenuItem = {
    ...item,
    id: `menu-${crypto.randomUUID().slice(0, 8)}`,
    prep_time_minutes: Math.max(0, item.prep_time_minutes),
    price: Math.max(0, item.price),
  };
  globalStore.menuItems.push(newItem);
  return newItem;
}

export function deleteMenuItem(id: string): boolean {
  const index = globalStore.menuItems.findIndex((item) => item.id === id);
  if (index === -1) return false;
  globalStore.menuItems.splice(index, 1);
  return true;
}
