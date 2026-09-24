import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";

export interface Customization {
  id: string;
  name: string;
  description: string;
  price_modifier: number;
  menu_item_ids: string[];
}

function toCustomization(row: {
  id: string;
  name: string;
  description: string;
  price_modifier: { toNumber(): number };
  menu_item_ids: string[];
}): Customization {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price_modifier: row.price_modifier.toNumber(),
    menu_item_ids: row.menu_item_ids,
  };
}

export async function getCustomizations(): Promise<Customization[]> {
  const rid = await getRestaurantId();
  const rows = await prisma.customization.findMany({ where: { restaurant_id: rid } });
  return rows.map(toCustomization);
}

export async function getCustomization(id: string): Promise<Customization | undefined> {
  const rid = await getRestaurantId();
  const row = await prisma.customization.findFirst({ where: { id, restaurant_id: rid } });
  return row ? toCustomization(row) : undefined;
}

export function customizationAppliesTo(c: Customization, menuItemId: string): boolean {
  if (c.menu_item_ids.length === 0) return true;
  return c.menu_item_ids.includes(menuItemId);
}

export async function getCustomizationsForMenuItem(menuItemId: string): Promise<Customization[]> {
  const all = await getCustomizations();
  return all.filter((c) => customizationAppliesTo(c, menuItemId));
}

export async function addCustomization(input: Omit<Customization, "id">): Promise<Customization> {
  const rid = await getRestaurantId();
  const row = await prisma.customization.create({
    data: {
      restaurant_id: rid,
      name: input.name.trim(),
      description: input.description.trim(),
      price_modifier: Math.max(0, input.price_modifier),
      menu_item_ids: input.menu_item_ids ?? [],
    },
  });
  return toCustomization(row);
}

export async function updateCustomization(
  id: string,
  updates: Partial<Omit<Customization, "id">>
): Promise<Customization | null> {
  const rid = await getRestaurantId();
  const existing = await prisma.customization.findFirst({ where: { id, restaurant_id: rid } });
  if (!existing) return null;

  const row = await prisma.customization.update({
    where: { id },
    data: {
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      description:
        updates.description !== undefined ? updates.description.trim() : existing.description,
      price_modifier:
        updates.price_modifier !== undefined
          ? Math.max(0, updates.price_modifier)
          : existing.price_modifier,
      menu_item_ids:
        updates.menu_item_ids !== undefined ? updates.menu_item_ids : existing.menu_item_ids,
    },
  });
  return toCustomization(row);
}

export async function deleteCustomization(id: string): Promise<boolean> {
  const rid = await getRestaurantId();
  const existing = await prisma.customization.findFirst({ where: { id, restaurant_id: rid } });
  if (!existing) return false;
  await prisma.customization.delete({ where: { id } });
  return true;
}
