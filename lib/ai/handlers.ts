import {
  classifyOrderSize,
  validateOrderItems,
  type OrderItemInput,
} from "@/lib/orders/validate";
import {
  ClosingValidationError,
  validateOrderForClosing,
} from "@/lib/orders/closing";
import {
  calculateReadyBy,
  formatWaitMinutes,
} from "@/lib/orders/ready-time";
import { calculateOrderTotals } from "@/lib/orders/totals";
import { formatCurrency } from "@/lib/utils/format";
import { addLead, type LeadType } from "@/lib/store/leads";
import { getStoreInfo } from "@/lib/store/info";
import { getMenuItems } from "@/lib/store/menu";
import {
  addOrder,
  findOrdersByCustomerName,
  getOrderById,
  updateOrder,
} from "@/lib/store/orders";
import type { Order, OrderItem } from "@/types/orders";

function formatItemList(items: OrderItem[]): string {
  return items
    .map((i) => {
      const mods =
        i.customizations?.length > 0
          ? ` (${i.customizations.map((c) => c.name).join(", ")})`
          : "";
      return `${i.quantity}× ${i.item_name}${mods}`;
    })
    .join(", ");
}

export interface ToolResult {
  success: boolean;
  message: string;
}

export function handleToolCall(
  name: string,
  args: Record<string, unknown>
): ToolResult {
  switch (name) {
    case "quote_order_total":
      return quoteOrderTotal(args);
    case "quote_ready_time":
      return quoteReadyTime(args);
    case "capture_order":
      return captureOrder(args);
    case "capture_catering_lead":
      return captureLead("catering", args);
    case "capture_large_order_lead":
      return captureLead("large_order", args);
    case "lookup_customer_orders":
      return lookupCustomerOrders(args);
    case "transfer_to_staff":
      return transferToStaff(args);
    case "modify_order":
      return modifyOrder(args);
    default:
      return { success: false, message: "Unknown tool" };
  }
}

function formatOrderLineItemsForReorder(items: OrderItem[]): string {
  return items
    .map((i) => {
      const customizationIds =
        i.customizations?.length > 0
          ? i.customizations.map((c) => c.id).join(", ")
          : "none";
      return `menu_item_id: ${i.menu_item_id} | qty: ${i.quantity} | customization_ids: [${customizationIds}] (${i.item_name})`;
    })
    .join("\n");
}

function formatOrderLookupSummary(order: Order): string {
  const items = formatItemList(order.items);
  const placed = new Date(order.created_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const modifiable =
    order.status === "pending" ? "yes" : "no — already completed";
  const reorderLines = formatOrderLineItemsForReorder(order.items);

  return `order_id: ${order.id} | items: ${items} | total: ${formatCurrency(order.total)} | status: ${order.status} | placed: ${placed} | modifiable: ${modifiable}\nreorder_line_items:\n${reorderLines}`;
}

function lookupGuidance(name: string, orders: Order[]): string {
  const pending = orders.filter((o) => o.status === "pending");
  const mostRecent = [...orders].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  const usualItems = formatItemList(mostRecent.items);

  const reorderGuidance = `REORDER / "THE USUAL" / "same as last time": Use most recent order ${mostRecent.id} (${usualItems}). Read back casually — e.g. "Hey ${name}, last time you got ${usualItems} — want that again?" If yes, use reorder_line_items from that order in capture_order (check availability first — swap sold-out items naturally). This is a NEW pickup order, not a modification. If they already gave their name, don't ask again. Continue normal order flow then capture_order.`;

  const changeGuidance =
    "If they want to CHANGE, CANCEL, ADD TO, or REMOVE FROM an existing active order → call transfer_to_staff immediately (you cannot modify orders).";

  if (pending.length === 1) {
    return `${reorderGuidance}\n\nORDER STATUS: One active order in progress — ${formatItemList(pending[0].items)}. Read back briefly if they ask where it is.\n\n${changeGuidance}`;
  }

  if (pending.length > 1) {
    return `${reorderGuidance}\n\nORDER STATUS: Multiple active orders — read each briefly if they ask about status.\n\n${changeGuidance}`;
  }

  return `${reorderGuidance}\n\n${changeGuidance}`;
}

function lookupCustomerOrders(args: Record<string, unknown>): ToolResult {
  const customer_name = args.customer_name as string;

  if (!customer_name?.trim()) {
    return { success: false, message: "Customer name is required to look up orders." };
  }

  const orders = findOrdersByCustomerName(customer_name, { limit: 5 });

  if (!orders.length) {
    return {
      success: true,
      message: `No orders found for "${customer_name}". For "the usual" / reorder requests: tell them you don't see a past order under that name — ask if they ordered under a different name, or take a fresh order from the menu. Do NOT transfer. For order status: same — no match under that name.`,
    };
  }

  const summaries = orders.map(formatOrderLookupSummary).join("\n");
  const guidance = lookupGuidance(customer_name.trim(), orders);

  return {
    success: true,
    message: `Orders for ${customer_name}:\n${summaries}\n\n${guidance}`,
  };
}

function transferToStaff(args: Record<string, unknown>): ToolResult {
  const reason = String(args.reason ?? "general").trim();
  const customer_name = (args.customer_name as string | undefined)?.trim();
  const phone = getStoreInfo().phone;
  const who = customer_name ? ` for ${customer_name}` : "";

  return {
    success: true,
    message: `Transfer${who} requested: ${reason}. This must close the customer's question — they should not be left hanging. Tell them you're connecting them now (one short line), then confirm the handoff. Examples: "Yeah, let me get you over to someone who can help with that — one sec." / "Hand-cut zabiha? Let me connect you with someone here who'd know for sure — one sec." Do NOT ask "would you like me to connect you?" — just connect. Do NOT guess, hedge, or say you're unsure without transferring. Do NOT say "let me check again." Restaurant phone (internal): ${phone}.`,
  };
}

function modifyOrder(args: Record<string, unknown>): ToolResult {
  try {
    const order_id = args.order_id as string;
    const items = args.items as OrderItemInput[];
    const menuItems = getMenuItems();

    const order = getOrderById(order_id);
    if (!order) {
      return { success: false, message: "Order not found. Call lookup_customer_orders first." };
    }

    if (order.status !== "pending") {
      return {
        success: false,
        message:
          "This order is already completed — it can't be changed. Tell the customer it's too late.",
      };
    }

    if (!items?.length) {
      return {
        success: false,
        message: "Updated order must include at least one item.",
      };
    }

    const { items: validated, subtotal: rawSubtotal } = validateOrderItems(items, menuItems);
    const { subtotal, tax_total, total } = calculateOrderTotals(rawSubtotal);
    const order_size = classifyOrderSize(subtotal);
    validateOrderForClosing(items, menuItems, order_size);
    const { ready_by, ready_by_display, total_minutes } = calculateReadyBy(
      items,
      menuItems,
      order_size
    );

    const updated = updateOrder(order_id, {
      items: validated,
      subtotal,
      tax_total,
      total,
      order_size,
      ready_by,
      notes: (args.notes as string) ?? order.notes,
    });

    if (!updated) {
      return {
        success: false,
        message: "Could not update order — it may no longer be modifiable.",
      };
    }

    const itemList = formatItemList(validated);
    const wait = formatWaitMinutes(total_minutes);

    return {
      success: true,
      message: `Order updated for ${order.customer_name}: ${itemList}. New total: ${formatCurrency(total)} (internal — only share if customer asked about price). Kitchen ready-by: ${ready_by_display} (internal only). Tell the customer in one spoken sentence: "Alright, I've got that updated — it'll be ready in about ${wait}." Only include the dollar total if they asked about price. No em dashes, no thanks.`,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof ClosingValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to update order",
    };
  }
}

function quoteOrderTotal(args: Record<string, unknown>): ToolResult {
  try {
    const items = args.items as OrderItemInput[];
    const menuItems = getMenuItems();

    if (!items?.length) {
      return { success: false, message: "No items provided" };
    }

    const { items: validated, subtotal: rawSubtotal } = validateOrderItems(items, menuItems);
    const { total } = calculateOrderTotals(rawSubtotal);

    const itemList = formatItemList(validated);

    return {
      success: true,
      message: `${itemList}: total is ${formatCurrency(total)} tax included. Tell the customer exactly ${formatCurrency(total)} — do not break down tax.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Could not calculate total",
    };
  }
}

function quoteReadyTime(args: Record<string, unknown>): ToolResult {
  try {
    const items = args.items as OrderItemInput[];
    const menuItems = getMenuItems();

    if (!items?.length) {
      return { success: false, message: "No items provided" };
    }

    const { subtotal: rawSubtotal } = validateOrderItems(items, menuItems);
    const order_size = classifyOrderSize(rawSubtotal);
    validateOrderForClosing(items, menuItems, order_size);
    const { ready_by_display, total_minutes, rush_applied } = calculateReadyBy(
      items,
      menuItems,
      order_size
    );

    const wait = formatWaitMinutes(total_minutes);
    const rushNote = rush_applied ? " (rush hour — extra time included)" : "";

    return {
      success: true,
      message: `Kitchen ready-by: ${ready_by_display}${rushNote} — internal only, do not tell the customer. Tell the customer in spoken phone style: "it'll be ready in about ${wait}" — never a dash or fragment like "— about ${wait}". Never say a clock time or "ready by".`,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof ClosingValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not calculate ready time",
    };
  }
}

function captureOrder(args: Record<string, unknown>): ToolResult {
  try {
    const customer_name = args.customer_name as string;
    const phone = (args.phone as string) || null;
    const items = args.items as OrderItemInput[];
    const menuItems = getMenuItems();

    if (!items?.length) {
      return {
        success: false,
        message: "No items provided",
      };
    }

    if (!customer_name?.trim()) {
      return {
        success: false,
        message:
          "Customer name is required. Confirm the order items with the customer first, then ask for their name before calling capture_order.",
      };
    }

    const { items: validated, subtotal: rawSubtotal } = validateOrderItems(items, menuItems);
    const { subtotal, tax_total, total } = calculateOrderTotals(rawSubtotal);
    const order_size = classifyOrderSize(subtotal);
    validateOrderForClosing(items, menuItems, order_size);
    const { ready_by, ready_by_display, total_minutes } = calculateReadyBy(
      items,
      menuItems,
      order_size
    );

    const order = addOrder({
      customer_name,
      phone,
      items: validated,
      subtotal,
      tax_total,
      total,
      order_size,
      ready_by,
      notes: (args.notes as string) ?? null,
    });

    const itemList = formatItemList(validated);

    const wait = formatWaitMinutes(total_minutes);

    return {
      success: true,
      message: `Order confirmed: ${itemList}. Total: ${formatCurrency(total)} (internal — only share if customer asked about price). Kitchen ready-by: ${ready_by_display} (internal only). Tell the customer in one spoken sentence, like a phone call: "Alright, it'll be ready in about ${wait}." Only include the dollar total if they asked about price. Use minutes, not a clock time. No em dashes, no thanks, no tax breakdown.`,
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof ClosingValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save order",
    };
  }
}

function captureLead(
  lead_type: LeadType,
  args: Record<string, unknown>
): ToolResult {
  const customer_name = args.customer_name as string;
  const phone = (args.phone as string) || null;
  const event_date = args.event_date as string;
  const guest_count = args.guest_count as number;

  if (!customer_name || !event_date || !guest_count) {
    return {
      success: false,
      message: "Missing required fields: name, event date, guest count",
    };
  }

  if (typeof guest_count !== "number" || guest_count < 1 || !Number.isInteger(guest_count)) {
    return {
      success: false,
      message: "Guest count must be a positive whole number.",
    };
  }

  addLead({
    lead_type,
    customer_name,
    phone,
    event_date,
    guest_count,
    notes: (args.notes as string) ?? null,
  });

  const label = lead_type === "catering" ? "Catering" : "Large order";
  return {
    success: true,
    message: `${label} lead saved for ${customer_name}, ${guest_count} guests on ${event_date}. Staff will follow up.`,
  };
}
