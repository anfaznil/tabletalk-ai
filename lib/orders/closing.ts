import type { MenuItem } from "@/lib/data/deens-bistro";
import { getHours } from "@/lib/store/hours";
import type { OrderSize } from "@/types/orders";
import { calculateReadyBy } from "@/lib/orders/ready-time";
import type { OrderItemInput } from "@/lib/orders/validate";

export const LAST_ORDER_MINUTES_BEFORE_CLOSE = 15;
export const LATE_ORDER_WINDOW_MINUTES = 15;
export const MAX_PREP_DURING_LATE_WINDOW = 10;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function getTodayClosingMinutes(at: Date = new Date()): number | null {
  const dayKey = DAY_KEYS[at.getDay()];
  const hoursStr = getHours()[dayKey];
  if (!hoursStr || hoursStr.toLowerCase() === "closed") return null;

  const parts = hoursStr.split(/[–-]/);
  if (parts.length < 2) return null;

  return parseTimeToMinutes(parts[1]);
}

export function getLastOrderDeadline(at: Date = new Date()): Date | null {
  const closingMinutes = getTodayClosingMinutes(at);
  if (closingMinutes === null) return null;

  const deadline = new Date(at);
  deadline.setHours(0, 0, 0, 0);
  deadline.setMinutes(
    closingMinutes - LAST_ORDER_MINUTES_BEFORE_CLOSE
  );

  return deadline;
}

export function getLateOrderWindowStart(at: Date = new Date()): Date | null {
  const lastOrder = getLastOrderDeadline(at);
  if (!lastOrder) return null;

  return new Date(
    lastOrder.getTime() - LATE_ORDER_WINDOW_MINUTES * 60_000
  );
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export class ClosingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClosingValidationError";
  }
}

export function validateOrderForClosing(
  items: OrderItemInput[],
  menuItems: MenuItem[],
  orderSize: OrderSize,
  at: Date = new Date()
): void {
  const lastOrder = getLastOrderDeadline(at);
  if (!lastOrder) return;

  const lastOrderDisplay = formatClockTime(lastOrder);

  if (at >= lastOrder) {
    throw new ClosingValidationError(
      `We're not taking new orders — last order is ${LAST_ORDER_MINUTES_BEFORE_CLOSE} minutes before closing (${lastOrderDisplay}).`
    );
  }

  const lateWindowStart = getLateOrderWindowStart(at);
  const inLateWindow = lateWindowStart ? at >= lateWindowStart : false;
  const menuMap = new Map(menuItems.map((m) => [m.id, m]));

  for (const input of items) {
    const menuItem = menuMap.get(input.menu_item_id);
    if (!menuItem) continue;

    if (
      inLateWindow &&
      menuItem.prep_time_minutes > MAX_PREP_DURING_LATE_WINDOW
    ) {
      throw new ClosingValidationError(
        `${menuItem.name} takes ${menuItem.prep_time_minutes} minutes — within ${LATE_ORDER_WINDOW_MINUTES} minutes of our last order time (${lastOrderDisplay}), we can only make items that take ${MAX_PREP_DURING_LATE_WINDOW} minutes or less.`
      );
    }
  }

  const { ready_by } = calculateReadyBy(items, menuItems, orderSize, at);
  const readyDate = new Date(ready_by);

  if (readyDate > lastOrder) {
    throw new ClosingValidationError(
      `Not enough time — orders must be ready by ${lastOrderDisplay} (last order is ${LAST_ORDER_MINUTES_BEFORE_CLOSE} minutes before we close).`
    );
  }
}
