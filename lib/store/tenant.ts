import { prisma } from "@/lib/db/prisma";

let cachedId: string | undefined;

/** Returns the current restaurant's DB id, resolved from RESTAURANT_ACCOUNT_ID env slug. */
export async function getRestaurantId(): Promise<string> {
  if (cachedId) return cachedId;
  const slug = process.env.RESTAURANT_ACCOUNT_ID ?? "deens-bistro";
  const r = await prisma.restaurant.findFirstOrThrow({ where: { slug }, select: { id: true } });
  cachedId = r.id;
  return cachedId;
}

/** Reset the cache (used in tests). */
export function resetTenantCache(): void {
  cachedId = undefined;
}
