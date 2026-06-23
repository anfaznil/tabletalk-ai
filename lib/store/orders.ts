import { loadPersisted, savePersisted } from "@/lib/store/persist";
import {
  ORDER_RETENTION_MONTHS,
  type Order,
} from "@/types/orders";

export type {
  Order,
  OrderItem,
  OrderItemCustomization,
  OrderSize,
  OrderStatus,
} from "@/types/orders";

export { ORDER_RETENTION_MONTHS } from "@/types/orders";

const globalStore = globalThis as unknown as { orders: Order[] };

function normalizeOrder(order: Order): Order {
  return {
    ...order,
    completed_at: order.completed_at ?? null,
    items: order.items.map((item) => ({
      ...item,
      customizations: item.customizations ?? [],
    })),
  };
}

function pruneOldOrders(): void {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - ORDER_RETENTION_MONTHS);
  globalStore.orders = globalStore.orders
    .map(normalizeOrder)
    .filter((o) => new Date(o.created_at) >= cutoff);
}

if (!globalStore.orders) {
  globalStore.orders = loadPersisted("orders", () => []);
  pruneOldOrders();
  savePersisted("orders", globalStore.orders);
}

function persist() {
  pruneOldOrders();
  savePersisted("orders", globalStore.orders);
}

export function addOrder(
  input: Omit<Order, "id" | "created_at" | "status" | "completed_at">
): Order {
  const order: Order = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    completed_at: null,
    created_at: new Date().toISOString(),
    items: input.items.map((item) => ({
      ...item,
      customizations: item.customizations ?? [],
    })),
  };
  globalStore.orders.unshift(order);
  persist();
  return order;
}

export function getOrders(): Order[] {
  return globalStore.orders.map(normalizeOrder);
}

export function getOrderById(id: string): Order | null {
  const order = globalStore.orders.find((o) => o.id === id);
  return order ? normalizeOrder(order) : null;
}

function normalizeCustomerName(name: string): string {
  return name.trim().toLowerCase();
}

function customerNamesMatch(orderName: string, searchName: string): boolean {
  const order = normalizeCustomerName(orderName);
  const search = normalizeCustomerName(searchName);
  if (!order || !search) return false;
  if (order === search) return true;

  const orderFirst = order.split(/\s+/)[0];
  const searchFirst = search.split(/\s+/)[0];
  return (
    orderFirst === searchFirst ||
    order.startsWith(`${search} `) ||
    order.startsWith(`${searchFirst} `)
  );
}

function isToday(dateIso: string, at: Date = new Date()): boolean {
  return new Date(dateIso).toDateString() === at.toDateString();
}

export function findOrdersByCustomerName(
  name: string,
  options: { limit?: number; todayOnly?: boolean } = {}
): Order[] {
  const { limit = 5, todayOnly = false } = options;
  if (!normalizeCustomerName(name)) return [];

  return getOrders()
    .filter((o) => customerNamesMatch(o.customer_name, name))
    .filter((o) => !todayOnly || isToday(o.created_at))
    .sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);
}

export function updateOrder(
  id: string,
  updates: Pick<
    Order,
    "items" | "subtotal" | "tax_total" | "total" | "order_size" | "ready_by" | "notes"
  >
): Order | null {
  const index = globalStore.orders.findIndex((o) => o.id === id);
  if (index === -1) return null;

  const current = normalizeOrder(globalStore.orders[index]);
  if (current.status !== "pending") return null;

  globalStore.orders[index] = {
    ...current,
    ...updates,
    items: updates.items.map((item) => ({
      ...item,
      customizations: item.customizations ?? [],
    })),
  };
  persist();
  return globalStore.orders[index];
}

export function completeOrder(id: string): Order | null {
  const index = globalStore.orders.findIndex((o) => o.id === id);
  if (index === -1) return null;

  const current = normalizeOrder(globalStore.orders[index]);
  if (current.status === "completed") return current;

  globalStore.orders[index] = {
    ...current,
    status: "completed",
    completed_at: new Date().toISOString(),
  };
  persist();
  return globalStore.orders[index];
}
