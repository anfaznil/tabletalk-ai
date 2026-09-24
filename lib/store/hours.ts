import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";

export type WeeklyHours = Record<string, string>;

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const HOURS_PATTERN =
  /^\s*\d{1,2}:\d{2}\s*(AM|PM)\s*[–-]\s*\d{1,2}:\d{2}\s*(AM|PM)\s*$/i;

function rowToHours(row: {
  mon: string | null;
  tue: string | null;
  wed: string | null;
  thu: string | null;
  fri: string | null;
  sat: string | null;
  sun: string | null;
}): WeeklyHours {
  return {
    mon: row.mon ?? "Closed",
    tue: row.tue ?? "Closed",
    wed: row.wed ?? "Closed",
    thu: row.thu ?? "Closed",
    fri: row.fri ?? "Closed",
    sat: row.sat ?? "Closed",
    sun: row.sun ?? "Closed",
  };
}

export async function getHours(): Promise<WeeklyHours> {
  const rid = await getRestaurantId();
  const row = await prisma.hours.findUnique({ where: { restaurant_id: rid } });
  return row ? rowToHours(row) : Object.fromEntries(DAY_KEYS.map((d) => [d, "Closed"]));
}

export async function updateHours(
  updates: WeeklyHours
): Promise<{ hours: WeeklyHours; errors: Record<string, string> }> {
  const rid = await getRestaurantId();
  const current = await getHours();
  const errors: Record<string, string> = {};
  const next = { ...current };

  for (const [day, value] of Object.entries(updates)) {
    if (!DAY_KEYS.includes(day as (typeof DAY_KEYS)[number])) continue;
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === "closed") {
      next[day] = "Closed";
    } else if (!HOURS_PATTERN.test(trimmed)) {
      errors[day] = `Use format "11:00 AM – 9:00 PM" or "Closed"`;
    } else {
      next[day] = trimmed;
    }
  }

  const updated = await prisma.hours.upsert({
    where: { restaurant_id: rid },
    create: { restaurant_id: rid, ...next },
    update: next,
  });
  return { hours: rowToHours(updated), errors };
}
