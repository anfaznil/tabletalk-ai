import type { Order } from "@/types/orders";

export interface TodayStats {
  sales: number;
  orderCount: number;
  averageTicket: number;
}

export function isToday(date: string, now: Date = new Date()): boolean {
  const d = new Date(date);
  return d.toDateString() === now.toDateString();
}

export function getTodayOrders(
  orders: Order[],
  now: Date = new Date()
): Order[] {
  return orders.filter((o) => isToday(o.created_at, now));
}

export function computeTodayStats(orders: Order[]): TodayStats {
  const today = getTodayOrders(orders);
  const sales = today.reduce((sum, o) => sum + (o.total ?? o.subtotal), 0);
  const orderCount = today.length;
  const averageTicket = orderCount > 0 ? sales / orderCount : 0;

  return { sales, orderCount, averageTicket };
}

export function getRecentOrders(orders: Order[], limit = 8): Order[] {
  return [...orders]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}

export function isInProgress(order: Order): boolean {
  return order.status !== "completed";
}

export function isCompleted(order: Order): boolean {
  return order.status === "completed";
}

/** Today's orders still being worked on. */
export function getTodayInProgressOrders(
  orders: Order[],
  now: Date = new Date()
): Order[] {
  return getTodayOrders(orders, now).filter(isInProgress);
}

/** Today's finished orders. */
export function getTodayCompletedOrders(
  orders: Order[],
  now: Date = new Date()
): Order[] {
  return getTodayOrders(orders, now).filter(isCompleted);
}

/** Past days — kept up to 12 months in storage. */
export function getHistoricalOrders(
  orders: Order[],
  now: Date = new Date()
): Order[] {
  return orders
    .filter((o) => !isToday(o.created_at, now))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function getTimeGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
