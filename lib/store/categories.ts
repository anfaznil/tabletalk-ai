import { deleteMenuItemsByCategory, getMenuItems, renameMenuItemsCategory } from "@/lib/store/menu";
import { loadPersisted, savePersisted } from "@/lib/store/persist";

const globalStore = globalThis as unknown as { menuCategories: string[] };

function seedCategories(): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const item of getMenuItems()) {
    const category = item.category?.trim();
    if (category && !seen.has(category.toLowerCase())) {
      seen.add(category.toLowerCase());
      categories.push(category);
    }
  }
  return categories;
}

if (!globalStore.menuCategories) {
  globalStore.menuCategories = loadPersisted("menuCategories", seedCategories);
}

function persist() {
  savePersisted("menuCategories", globalStore.menuCategories);
}

export function getCategories(): string[] {
  return globalStore.menuCategories;
}

function findCategory(name: string): string | undefined {
  return globalStore.menuCategories.find(
    (c) => c.toLowerCase() === name.trim().toLowerCase()
  );
}

export function addCategory(name: string): {
  category?: string;
  error?: string;
} {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Category name is required" };

  const existing = findCategory(trimmed);
  if (existing) return { error: `"${existing}" already exists` };

  globalStore.menuCategories.push(trimmed);
  persist();
  return { category: trimmed };
}

/** Adds the category if it isn't known yet (used when saving menu items). */
export function ensureCategory(name: string): void {
  const trimmed = name.trim();
  if (!trimmed || findCategory(trimmed)) return;
  globalStore.menuCategories.push(trimmed);
  persist();
}

/** Renames a category and moves all menu items in it to the new name. */
export function renameCategory(
  from: string,
  to: string
): { category?: string; error?: string } {
  const existing = findCategory(from);
  if (!existing) return { error: "Category not found" };

  const trimmed = to.trim();
  if (!trimmed) return { error: "Category name is required" };
  if (trimmed === existing) return { category: existing };

  const clash = findCategory(trimmed);
  if (clash && clash !== existing) {
    return { error: `"${clash}" already exists` };
  }

  globalStore.menuCategories = globalStore.menuCategories.map((c) =>
    c === existing ? trimmed : c
  );
  persist();
  renameMenuItemsCategory(existing, trimmed);
  return { category: trimmed };
}

/**
 * Deletes a category and all menu items inside it.
 * Returns the count of deleted items so the caller can show a confirmation.
 */
export function deleteCategory(name: string): { error?: string; deletedItemCount?: number } {
  const existing = findCategory(name);
  if (!existing) return { error: "Category not found" };

  const deletedItemCount = deleteMenuItemsByCategory(existing);

  globalStore.menuCategories = globalStore.menuCategories.filter(
    (c) => c !== existing
  );

  persist();
  return { deletedItemCount };
}

export function moveCategory(
  name: string,
  direction: "up" | "down"
): { categories?: string[]; error?: string } {
  const existing = findCategory(name);
  if (!existing) return { error: "Category not found" };

  const index = globalStore.menuCategories.indexOf(existing);
  if (index === -1) return { error: "Category not found" };

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= globalStore.menuCategories.length) {
    return { error: "Can't move category further" };
  }

  const next = [...globalStore.menuCategories];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  globalStore.menuCategories = next;
  persist();
  return { categories: globalStore.menuCategories };
}
