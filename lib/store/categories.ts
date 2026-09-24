import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";
import { deleteMenuItemsByCategory, renameMenuItemsCategory } from "@/lib/store/menu";

export async function getCategories(): Promise<string[]> {
  const rid = await getRestaurantId();
  const rows = await prisma.menuCategory.findMany({
    where: { restaurant_id: rid },
    orderBy: { position: "asc" },
  });
  return rows.map((r) => r.name);
}

export async function addCategory(name: string): Promise<{ category?: string; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Category name is required" };

  const rid = await getRestaurantId();
  const existing = await prisma.menuCategory.findFirst({
    where: { restaurant_id: rid, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return { error: `"${existing.name}" already exists` };

  const agg = await prisma.menuCategory.aggregate({
    where: { restaurant_id: rid },
    _max: { position: true },
  });
  await prisma.menuCategory.create({
    data: { restaurant_id: rid, name: trimmed, position: (agg._max.position ?? -1) + 1 },
  });
  return { category: trimmed };
}

export async function ensureCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const rid = await getRestaurantId();
  const existing = await prisma.menuCategory.findFirst({
    where: { restaurant_id: rid, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return;
  const agg = await prisma.menuCategory.aggregate({
    where: { restaurant_id: rid },
    _max: { position: true },
  });
  await prisma.menuCategory.create({
    data: { restaurant_id: rid, name: trimmed, position: (agg._max.position ?? -1) + 1 },
  });
}

export async function renameCategory(
  from: string,
  to: string
): Promise<{ category?: string; error?: string }> {
  const rid = await getRestaurantId();
  const existing = await prisma.menuCategory.findFirst({
    where: { restaurant_id: rid, name: { equals: from, mode: "insensitive" } },
  });
  if (!existing) return { error: "Category not found" };

  const trimmed = to.trim();
  if (!trimmed) return { error: "Category name is required" };
  if (trimmed.toLowerCase() === existing.name.toLowerCase()) return { category: existing.name };

  const clash = await prisma.menuCategory.findFirst({
    where: { restaurant_id: rid, name: { equals: trimmed, mode: "insensitive" } },
  });
  if (clash && clash.id !== existing.id) return { error: `"${clash.name}" already exists` };

  await prisma.menuCategory.update({ where: { id: existing.id }, data: { name: trimmed } });
  await renameMenuItemsCategory(existing.name, trimmed);
  return { category: trimmed };
}

export async function deleteCategory(
  name: string
): Promise<{ error?: string; deletedItemCount?: number }> {
  const rid = await getRestaurantId();
  const existing = await prisma.menuCategory.findFirst({
    where: { restaurant_id: rid, name: { equals: name, mode: "insensitive" } },
  });
  if (!existing) return { error: "Category not found" };

  const deletedItemCount = await deleteMenuItemsByCategory(existing.name);
  await prisma.menuCategory.delete({ where: { id: existing.id } });
  return { deletedItemCount };
}

export async function moveCategory(
  name: string,
  direction: "up" | "down"
): Promise<{ categories?: string[]; error?: string }> {
  const rid = await getRestaurantId();
  const all = await prisma.menuCategory.findMany({
    where: { restaurant_id: rid },
    orderBy: { position: "asc" },
  });

  const index = all.findIndex((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  if (index === -1) return { error: "Category not found" };

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= all.length) {
    return { error: "Can't move category further" };
  }

  await prisma.$transaction([
    prisma.menuCategory.update({ where: { id: all[index].id }, data: { position: targetIndex } }),
    prisma.menuCategory.update({ where: { id: all[targetIndex].id }, data: { position: index } }),
  ]);

  const updated = await getCategories();
  return { categories: updated };
}
