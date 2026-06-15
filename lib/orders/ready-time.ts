import type { MenuItem } from "@/lib/data/deens-bistro";
import type { OrderSize } from "@/types/orders";
import { calculateOrderPrepMinutes } from "@/lib/orders/prep-time";
import type { OrderItemInput } from "@/lib/orders/validate";

const LUNCH_START = 11 * 60 + 30; // 11:30 AM
const LUNCH_END = 14 * 60; // 2:00 PM
const DINNER_START = 17 * 60 + 30; // 5:30 PM
const DINNER_END = 21 * 60; // 9:00 PM

export function isRushHour(at: Date = new Date()): boolean {
  const minutes = at.getHours() * 60 + at.getMinutes();
  const atLunch = minutes >= LUNCH_START && minutes < LUNCH_END;
  const atDinner = minutes >= DINNER_START && minutes < DINNER_END;
  return atLunch || atDinner;
}

export function rushBufferMinutes(orderSize: OrderSize): number {
  return orderSize === "large" ? 15 : 10;
}

export interface ReadyTimeResult {
  ready_by: string;
  ready_by_display: string;
  total_minutes: number;
  rush_applied: boolean;
}

export function calculateReadyBy(
  items: OrderItemInput[],
  menuItems: MenuItem[],
  orderSize: OrderSize,
  placedAt: Date = new Date()
): ReadyTimeResult {
  const basePrep = calculateOrderPrepMinutes(items, menuItems);
  const rush = isRushHour(placedAt);
  const rushExtra = rush ? rushBufferMinutes(orderSize) : 0;
  const total_minutes = basePrep + rushExtra;

  const readyDate = new Date(placedAt.getTime() + total_minutes * 60_000);

  return {
    ready_by: readyDate.toISOString(),
    ready_by_display: formatReadyBy(readyDate),
    total_minutes,
    rush_applied: rush,
  };
}

/** Customer-facing wait estimate — e.g. "15 minutes". */
export function formatWaitMinutes(minutes: number): string {
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

/** Spoken wait-time phrase for phone calls — e.g. "and it'll be ready in about 10 minutes". */
export function formatSpokenReadyIn(minutes: number): string {
  return `and it'll be ready in about ${formatWaitMinutes(minutes)}`;
}

export function formatReadyBy(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return time;

  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
