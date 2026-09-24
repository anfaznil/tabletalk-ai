import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";
import { emit as emitOrder } from "@/lib/kitchen/event-bus";

export type {
  Order,
  OrderItem,
  OrderItemCustomization,
  OrderSize,
  OrderStatus,
} from "@/types/orders";

export { ORDER_RETENTION_MONTHS } from "@/types/orders";

import type { Order, OrderItem, OrderSize } from "@/types/orders";

type PrismaOrderItem = {
  id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: { toNumber(): number };
  line_total: { toNumber(): number };
  customization_ids: string[];
  customization_names: string[];
  customization_price_modifiers: { toNumber(): number }[];
  notes: string | null;
};

type PrismaOrder = {
  id: string;
  customer_name: string;
  phone: string | null;
  order_size: string;
  subtotal: { toNumber(): number };
  tax_total: { toNumber(): number };
  total: { toNumber(): number };
  status: string;
  ready_by: Date | null;
  notes: string | null;
  created_at: Date;
  completed_at: Date | null;
  items: PrismaOrderItem[];
};

function toOrderItem(row: PrismaOrderItem): OrderItem {
  const customizations = row.customization_ids.map((id, i) => ({
    id,
    name: row.customization_names[i] ?? "",
    price_modifier: row.customization_price_modifiers[i]?.toNumber() ?? 0,
  }));
  return {
    menu_item_id: row.menu_item_id ?? "",
    item_name: row.item_name,
    quantity: row.quantity,
    unit_price: row.unit_price.toNumber(),
    line_total: row.line_total.toNumber(),
    customizations,
    notes: row.notes,
  };
}

function toOrder(row: PrismaOrder): Order {
  return {
    id: row.id,
    customer_name: row.customer_name,
    phone: row.phone,
    items: row.items.map(toOrderItem),
    subtotal: row.subtotal.toNumber(),
    tax_total: row.tax_total.toNumber(),
    total: row.total.toNumber(),
    order_size: row.order_size as OrderSize,
    ready_by: row.ready_by?.toISOString() ?? "",
    notes: row.notes,
    status: row.status as Order["status"],
    created_at: row.created_at.toISOString(),
    completed_at: row.completed_at?.toISOString() ?? null,
  };
}

const ORDER_INCLUDE = { items: { orderBy: { id: "asc" as const } } };

export async function addOrder(
  input: Omit<Order, "id" | "created_at" | "status" | "completed_at">
): Promise<Order> {
  const rid = await getRestaurantId();

  const created = await prisma.order.create({
    data: {
      restaurant_id: rid,
      customer_name: input.customer_name,
      phone: input.phone,
      order_size: input.order_size,
      subtotal: input.subtotal,
      tax_total: input.tax_total,
      total: input.total,
      status: "pending",
      ready_by: input.ready_by ? new Date(input.ready_by) : null,
      notes: input.notes,
      items: {
        create: input.items.map((item) => ({
          menu_item_id: item.menu_item_id || null,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          customization_ids: item.customizations.map((c) => c.id),
          customization_names: item.customizations.map((c) => c.name),
          customization_price_modifiers: item.customizations.map((c) => c.price_modifier),
          notes: item.notes,
        })),
      },
    },
    include: ORDER_INCLUDE,
  });
  const order = toOrder(created as unknown as PrismaOrder);
  emitOrder(rid, order);
  return order;
}

export async function getOrders(): Promise<Order[]> {
  const rid = await getRestaurantId();
  const rows = await prisma.order.findMany({
    where: { restaurant_id: rid },
    orderBy: { created_at: "desc" },
    include: ORDER_INCLUDE,
  });
  return rows.map((r) => toOrder(r as unknown as PrismaOrder));
}

export async function getOrderById(id: string): Promise<Order | null> {
  const rid = await getRestaurantId();
  const row = await prisma.order.findFirst({
    where: { id, restaurant_id: rid },
    include: ORDER_INCLUDE,
  });
  return row ? toOrder(row as unknown as PrismaOrder) : null;
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

export async function findOrdersByCustomerName(
  name: string,
  options: { limit?: number; todayOnly?: boolean } = {}
): Promise<Order[]> {
  const { limit = 5, todayOnly = false } = options;
  if (!normalizeCustomerName(name)) return [];

  const rid = await getRestaurantId();
  const cutoff = todayOnly ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })() : undefined;

  const rows = await prisma.order.findMany({
    where: {
      restaurant_id: rid,
      ...(cutoff ? { created_at: { gte: cutoff } } : {}),
    },
    orderBy: { created_at: "desc" },
    include: ORDER_INCLUDE,
    take: 200,
  });

  return rows
    .map((r) => toOrder(r as unknown as PrismaOrder))
    .filter((o) => customerNamesMatch(o.customer_name, name))
    .sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);
}

export async function updateOrder(
  id: string,
  updates: Pick<Order, "items" | "subtotal" | "tax_total" | "total" | "order_size" | "ready_by" | "notes">
): Promise<Order | null> {
  const rid = await getRestaurantId();
  const existing = await prisma.order.findFirst({ where: { id, restaurant_id: rid } });
  if (!existing || existing.status !== "pending") return null;

  await prisma.orderItem.deleteMany({ where: { order_id: id } });

  const updated = await prisma.order.update({
    where: { id },
    data: {
      order_size: updates.order_size,
      subtotal: updates.subtotal,
      tax_total: updates.tax_total,
      total: updates.total,
      ready_by: updates.ready_by ? new Date(updates.ready_by) : null,
      notes: updates.notes,
      items: {
        create: updates.items.map((item) => ({
          menu_item_id: item.menu_item_id || null,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          customization_ids: item.customizations.map((c) => c.id),
          customization_names: item.customizations.map((c) => c.name),
          customization_price_modifiers: item.customizations.map((c) => c.price_modifier),
          notes: item.notes,
        })),
      },
    },
    include: ORDER_INCLUDE,
  });
  return toOrder(updated as unknown as PrismaOrder);
}

export async function completeOrder(id: string): Promise<Order | null> {
  const rid = await getRestaurantId();
  const existing = await prisma.order.findFirst({
    where: { id, restaurant_id: rid },
    include: ORDER_INCLUDE,
  });
  if (!existing) return null;
  if (existing.status === "completed") return toOrder(existing as unknown as PrismaOrder);

  const updated = await prisma.order.update({
    where: { id },
    data: { status: "completed", completed_at: new Date() },
    include: ORDER_INCLUDE,
  });
  return toOrder(updated as unknown as PrismaOrder);
}

export async function setOrderStatus(
  id: string,
  status: "completed" | "cancelled"
): Promise<Order | null> {
  const rid = await getRestaurantId();
  const existing = await prisma.order.findFirst({ where: { id, restaurant_id: rid } });
  if (!existing) return null;
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(status === "completed" ? { completed_at: new Date() } : {}),
    },
    include: ORDER_INCLUDE,
  });
  return toOrder(updated as unknown as PrismaOrder);
}

