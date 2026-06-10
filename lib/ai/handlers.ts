import {
  classifyOrderSize,
  validateOrderItems,
  type OrderItemInput,
} from "@/lib/orders/validate";
import {
  ClosingValidationError,
  validateOrderForClosing,
} from "@/lib/orders/closing";
import { calculateReadyBy } from "@/lib/orders/ready-time";
import { calculateOrderTotals } from "@/lib/orders/totals";
import { formatCurrency } from "@/lib/utils/format";
import { addLead, type LeadType } from "@/lib/store/leads";
import { getMenuItems } from "@/lib/store/menu";
import { addOrder } from "@/lib/store/orders";

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
    default:
      return { success: false, message: "Unknown tool" };
  }
}

function quoteOrderTotal(args: Record<string, unknown>): ToolResult {
  try {
    const items = args.items as OrderItemInput[];
    const menuItems = getMenuItems();

    if (!items?.length) {
      return { success: false, message: "No items provided" };
    }

    const { items: validated, subtotal } = validateOrderItems(items, menuItems);
    const { total } = calculateOrderTotals(subtotal);

    const itemList = validated
      .map((i) => `${i.quantity}× ${i.item_name}`)
      .join(", ");

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

    const { subtotal } = validateOrderItems(items, menuItems);
    const order_size = classifyOrderSize(subtotal);
    validateOrderForClosing(items, menuItems, order_size);
    const { ready_by_display, rush_applied } = calculateReadyBy(
      items,
      menuItems,
      order_size
    );

    const rushNote = rush_applied ? " (rush hour — extra time included)" : "";

    return {
      success: true,
      message: `Ready by ${ready_by_display}${rushNote}. Tell the customer a clock time like "ready by ${ready_by_display}" — never say "in X minutes".`,
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

    if (!customer_name || !items?.length) {
      return {
        success: false,
        message: "Missing required fields: name, items",
      };
    }

    const { items: validated, subtotal } = validateOrderItems(items, menuItems);
    const { tax_total, total } = calculateOrderTotals(subtotal);
    const order_size = classifyOrderSize(subtotal);
    validateOrderForClosing(items, menuItems, order_size);
    const { ready_by, ready_by_display } = calculateReadyBy(
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

    const itemList = validated
      .map((i) => `${i.quantity}× ${i.item_name}`)
      .join(", ");

    return {
      success: true,
      message: `Order confirmed: ${itemList}. Total: ${formatCurrency(total)}. Ready by ${ready_by_display}. Tell the customer: "${formatCurrency(total)} total, ready by ${ready_by_display}." Use the clock time — no thanks, no tax breakdown, no "in X minutes".`,
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
