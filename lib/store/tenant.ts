import { prisma } from "@/lib/db/prisma";

// Cached fallback for non-request contexts (WebSocket server, seed, etc.)
let envCachedId: string | undefined;

/**
 * Returns the current restaurant's DB id.
 *
 * In request context (API routes, server components): reads the `x-restaurant-id`
 * header injected by middleware from the verified session cookie.
 *
 * In non-request contexts (WebSocket relay, seed script): resolves from the
 * RESTAURANT_ACCOUNT_ID env slug and caches it in module scope.
 */
export async function getRestaurantId(): Promise<string> {
  // Request context: header takes priority (multi-tenant)
  try {
    const { headers } = await import("next/headers");
    const rid = (await headers()).get("x-restaurant-id");
    if (rid) return rid;
  } catch {
    // Outside Next.js request context — fall through to env fallback
  }

  // Non-request fallback (voice WebSocket, CLI tools)
  if (envCachedId) return envCachedId;
  const slug = process.env.RESTAURANT_ACCOUNT_ID ?? "deens-bistro";
  const r = await prisma.restaurant.findFirstOrThrow({ where: { slug }, select: { id: true } });
  envCachedId = r.id;
  return envCachedId;
}

/** Reset the env cache (used in tests). */
export function resetTenantCache(): void {
  envCachedId = undefined;
}
