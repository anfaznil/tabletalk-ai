import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";
import type { MenuItemAvailability } from "@/types/menu";

export type { MenuItemAvailability } from "@/types/menu";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  prep_time_minutes: number;
  availability?: MenuItemAvailability;
  sold_out_today_on?: string;
  sort_order?: number;
}

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

function toMenuItem(row: {
  id: string;
  name: string;
  description: string | null;
  price: { toNumber(): number };
  category: string;
  prep_time_minutes: number;
  availability: string;
  sold_out_today_on: string | null;
  position: number;
}): MenuItem {
  let availability = (
    VALID_AVAILABILITY.includes(row.availability as MenuItemAvailability)
      ? row.availability
      : "in_stock"
  ) as MenuItemAvailability;

  let sold_out_today_on: string | undefined = row.sold_out_today_on ?? undefined;

  // Midnight reset: if sold_out_today was marked on a prior day, restore in_stock.
  if (availability === "sold_out_today" && sold_out_today_on) {
    const today = getLocalDateKey();
    if (sold_out_today_on < today) {
      availability = "in_stock";
      sold_out_today_on = undefined;
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: row.price.toNumber(),
    category: row.category,
    prep_time_minutes: row.prep_time_minutes,
    availability,
    sold_out_today_on,
    sort_order: row.position,
  };
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const rid = await getRestaurantId();
  const rows = await prisma.menuItem.findMany({
    where: { restaurant_id: rid },
    orderBy: [{ category: "asc" }, { position: "asc" }],
  });
  return rows.map(toMenuItem);
}

export async function getMenuItem(id: string): Promise<MenuItem | undefined> {
  const rid = await getRestaurantId();
  const row = await prisma.menuItem.findFirst({ where: { id, restaurant_id: rid } });
  return row ? toMenuItem(row) : undefined;
}

export async function updateMenuItem(
  id: string,
  updates: Partial<Omit<MenuItem, "id">>
): Promise<MenuItem | null> {
  const rid = await getRestaurantId();
  const existing = await prisma.menuItem.findFirst({ where: { id, restaurant_id: rid } });
  if (!existing) return null;

  let availability = existing.availability;
  let sold_out_today_on = existing.sold_out_today_on;

  if (updates.availability !== undefined && VALID_AVAILABILITY.includes(updates.availability)) {
    availability = updates.availability;
    if (availability === "sold_out_today") {
      sold_out_today_on = getLocalDateKey();
    } else {
      sold_out_today_on = null;
    }
  }

  const updated = await prisma.menuItem.update({
    where: { id },
    data: {
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      price: updates.price !== undefined ? Math.max(0, updates.price) : existing.price,
      category: updates.category ?? existing.category,
      prep_time_minutes:
        updates.prep_time_minutes !== undefined
          ? Math.max(0, updates.prep_time_minutes)
          : existing.prep_time_minutes,
      availability,
      sold_out_today_on,
      position:
        updates.sort_order !== undefined ? Math.max(0, updates.sort_order) : existing.position,
    },
  });
  return toMenuItem(updated);
}

export async function addMenuItem(item: Omit<MenuItem, "id">): Promise<MenuItem> {
  const rid = await getRestaurantId();

  // Determine position: max in category + 1.
  const agg = await prisma.menuItem.aggregate({
    where: { restaurant_id: rid, category: item.category ?? "General" },
    _max: { position: true },
  });
  const nextPosition =
    item.sort_order !== undefined
      ? item.sort_order
      : (agg._max.position ?? -1) + 1;

  const created = await prisma.menuItem.create({
    data: {
      restaurant_id: rid,
      name: item.name,
      description: item.description ?? "",
      price: Math.max(0, item.price),
      category: item.category ?? "General",
      prep_time_minutes: Math.max(0, item.prep_time_minutes),
      availability: item.availability ?? "in_stock",
      sold_out_today_on:
        item.availability === "sold_out_today" ? getLocalDateKey() : null,
      position: nextPosition,
    },
  });
  return toMenuItem(created);
}

export async function renameMenuItemsCategory(from: string, to: string): Promise<void> {
  const rid = await getRestaurantId();
  await prisma.menuItem.updateMany({
    where: { restaurant_id: rid, category: { equals: from, mode: "insensitive" } },
    data: { category: to },
  });
}

export async function reorderMenuItemsInCategory(
  category: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const rid = await getRestaurantId();
  const items = await prisma.menuItem.findMany({
    where: { restaurant_id: rid, category: { equals: category, mode: "insensitive" } },
    select: { id: true },
  });

  if (orderedIds.length !== items.length) return { error: "Invalid item order" };
  const idSet = new Set(items.map((i) => i.id));
  if (!orderedIds.every((id) => idSet.has(id))) return { error: "Invalid item order" };

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.menuItem.update({ where: { id }, data: { position: index } })
    )
  );
  return {};
}

export async function deleteMenuItemsByCategory(category: string): Promise<number> {
  const rid = await getRestaurantId();
  const result = await prisma.menuItem.deleteMany({
    where: { restaurant_id: rid, category: { equals: category, mode: "insensitive" } },
  });
  return result.count;
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const rid = await getRestaurantId();
  const existing = await prisma.menuItem.findFirst({ where: { id, restaurant_id: rid } });
  if (!existing) return false;
  await prisma.menuItem.delete({ where: { id } });
  return true;
}
