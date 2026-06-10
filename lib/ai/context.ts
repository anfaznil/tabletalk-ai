import { deensBistro } from "@/lib/data/deens-bistro";
import {
  LAST_ORDER_MINUTES_BEFORE_CLOSE,
  LATE_ORDER_WINDOW_MINUTES,
  MAX_PREP_DURING_LATE_WINDOW,
} from "@/lib/orders/closing";
import { getHours } from "@/lib/store/hours";
import { getMenuItems } from "@/lib/store/menu";
import { getTaxes } from "@/lib/store/taxes";
import { formatCurrency } from "@/lib/utils/format";

export function buildRestaurantContext(): string {
  const restaurant = deensBistro;
  const menuItems = getMenuItems();

  const hours = Object.entries(getHours())
    .map(([day, h]) => `${day}: ${h}`)
    .join("\n");

  const menu = menuItems
    .map(
      (item) =>
        `- ${item.name} [id: ${item.id}] (${item.category}): ${formatCurrency(item.price)}, ${item.prep_time_minutes} min — ${item.description}`
    )
    .join("\n");

  const faqText = restaurant.faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const taxes = getTaxes();
  const combinedRate =
    taxes.food_beverage_tax_percent + taxes.sales_tax_percent;

  const now = new Date();
  const currentDateTime = now.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `
CURRENT DATE & TIME: ${currentDateTime}

RESTAURANT: ${restaurant.name}
PHONE: ${restaurant.phone}
ADDRESS: ${restaurant.address}
WEBSITE: ${restaurant.website}
HOURS:
${hours}
CATERING AVAILABLE: ${restaurant.catering_available ? "Yes" : "No"}
FULFILLMENT: Pickup only

TAXES (use quote_order_total tool for all price quotes — do not calculate yourself):
- Food & beverage tax: ${taxes.food_beverage_tax_percent}%
- Sales tax: ${taxes.sales_tax_percent}%
- Combined: ${combinedRate}% on subtotal
- Tax IS included in totals. Never say tax is added at checkout.

CLOSING (enforced by quote_ready_time / capture_order):
- Last order accepted ${LAST_ORDER_MINUTES_BEFORE_CLOSE} minutes before closing
- Final ${LATE_ORDER_WINDOW_MINUTES} minutes before last order: only items with ${MAX_PREP_DURING_LATE_WINDOW} min prep or less
- Orders must be ready by last order time

RUSH HOURS (extra wait added automatically by quote_ready_time / capture_order):
- Lunch: 11:30 AM – 2:00 PM (+10 min small orders, +15 min large)
- Dinner: 5:30 PM – 9:00 PM (+10 min small orders, +15 min large)

MENU (menu prices are BEFORE tax — use quote_order_total for prices; use quote_ready_time for ready-by clock times):
${menu}

FAQs:
${faqText}
`.trim();
}
