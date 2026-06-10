export type OrderSize = "small" | "large";
export type OrderStatus = "pending" | "confirmed" | "ready" | "completed";

export interface OrderItem {
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes: string | null;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string | null;
  items: OrderItem[];
  subtotal: number;
  tax_total: number;
  total: number;
  order_size: OrderSize;
  ready_by: string;
  notes: string | null;
  status: OrderStatus;
  created_at: string;
}

const globalStore = globalThis as unknown as { orders: Order[] };

if (!globalStore.orders) {
  globalStore.orders = [];
}

export function addOrder(
  input: Omit<Order, "id" | "created_at" | "status">
): Order {
  const order: Order = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    created_at: new Date().toISOString(),
  };
  globalStore.orders.unshift(order);
  return order;
}

export function getOrders(): Order[] {
  return globalStore.orders;
}
