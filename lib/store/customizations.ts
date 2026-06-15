import { loadPersisted, savePersisted } from "@/lib/store/persist";

export interface Customization {
  id: string;
  name: string;
  description: string;
  /** Added to the line item total (before tax), per unit. */
  price_modifier: number;
  /** Empty = applies to all menu items. Otherwise only these item ids. */
  menu_item_ids: string[];
}

const globalStore = globalThis as unknown as {
  customizations: Customization[];
};

if (!globalStore.customizations) {
  globalStore.customizations = loadPersisted("customizations", () => []);
}

function persist() {
  savePersisted("customizations", globalStore.customizations);
}

export function getCustomizations(): Customization[] {
  return globalStore.customizations;
}

export function getCustomization(id: string): Customization | undefined {
  return globalStore.customizations.find((c) => c.id === id);
}

export function customizationAppliesTo(
  customization: Customization,
  menuItemId: string
): boolean {
  if (customization.menu_item_ids.length === 0) return true;
  return customization.menu_item_ids.includes(menuItemId);
}

export function getCustomizationsForMenuItem(
  menuItemId: string
): Customization[] {
  return globalStore.customizations.filter((c) =>
    customizationAppliesTo(c, menuItemId)
  );
}

export function addCustomization(
  input: Omit<Customization, "id">
): Customization {
  const customization: Customization = {
    ...input,
    id: `cust-${crypto.randomUUID().slice(0, 8)}`,
    name: input.name.trim(),
    description: input.description.trim(),
    price_modifier: Math.max(0, input.price_modifier),
    menu_item_ids: input.menu_item_ids ?? [],
  };
  globalStore.customizations.push(customization);
  persist();
  return customization;
}

export function updateCustomization(
  id: string,
  updates: Partial<Omit<Customization, "id">>
): Customization | null {
  const index = globalStore.customizations.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const current = globalStore.customizations[index];
  globalStore.customizations[index] = {
    ...current,
    ...updates,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    description:
      updates.description !== undefined
        ? updates.description.trim()
        : current.description,
    price_modifier:
      updates.price_modifier !== undefined
        ? Math.max(0, updates.price_modifier)
        : current.price_modifier,
    menu_item_ids:
      updates.menu_item_ids !== undefined
        ? updates.menu_item_ids
        : current.menu_item_ids,
  };
  persist();
  return globalStore.customizations[index];
}

export function deleteCustomization(id: string): boolean {
  const index = globalStore.customizations.findIndex((c) => c.id === id);
  if (index === -1) return false;
  globalStore.customizations.splice(index, 1);
  persist();
  return true;
}
