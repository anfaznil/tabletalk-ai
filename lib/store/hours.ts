import { deensBistro } from "@/lib/data/deens-bistro";

export type WeeklyHours = Record<string, string>;

export const DAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

/** Matches e.g. "11:00 AM – 9:00 PM" (also accepts plain hyphen). "Closed" is allowed. */
export const HOURS_PATTERN =
  /^\s*\d{1,2}:\d{2}\s*(AM|PM)\s*[–-]\s*\d{1,2}:\d{2}\s*(AM|PM)\s*$/i;

const globalStore = globalThis as unknown as { hours: WeeklyHours };

if (!globalStore.hours) {
  globalStore.hours = { ...deensBistro.hours };
}

export function getHours(): WeeklyHours {
  return globalStore.hours;
}

export function updateHours(updates: WeeklyHours): {
  hours: WeeklyHours;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  for (const [day, value] of Object.entries(updates)) {
    if (!DAY_KEYS.includes(day as (typeof DAY_KEYS)[number])) continue;

    const trimmed = value.trim();
    if (trimmed.toLowerCase() === "closed") {
      globalStore.hours[day] = "Closed";
      continue;
    }
    if (!HOURS_PATTERN.test(trimmed)) {
      errors[day] = `Use format "11:00 AM – 9:00 PM" or "Closed"`;
      continue;
    }
    globalStore.hours[day] = trimmed;
  }

  return { hours: globalStore.hours, errors };
}
