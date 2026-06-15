/** Shared order types — safe to import in client components (no Node.js fs). */

export type OrderSize = "small" | "large";
export type OrderStatus = "pending" | "confirmed" | "ready" | "completed";

export const ORDER_RETENTION_MONTHS = 12;

export interface OrderItemCustomization {
  id: string;
  name: string;
  price_modifier: number;
}

export interface OrderItem {
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  customizations: OrderItemCustomization[];
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
  completed_at: string | null;
}
