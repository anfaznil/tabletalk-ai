import {
  LAST_ORDER_MINUTES_BEFORE_CLOSE,
  LATE_ORDER_WINDOW_MINUTES,
  MAX_PREP_DURING_LATE_WINDOW,
} from "@/lib/orders/closing";
import { getFaqs } from "@/lib/store/faqs";
import { getHours } from "@/lib/store/hours";
import { getStoreInfo } from "@/lib/store/info";
import {
  customizationAppliesTo,
  getCustomizations,
} from "@/lib/store/customizations";
import { getMenuItems } from "@/lib/store/menu";
import { menuItemAvailabilityLabel } from "@/types/menu";
import { getTaxes } from "@/lib/store/taxes";
import { formatCurrency } from "@/lib/utils/format";

export function buildRestaurantContext(): string {
  const restaurant = getStoreInfo();
  const menuItems = getMenuItems();

  const hours = Object.entries(getHours())
    .map(([day, h]) => `${day}: ${h}`)
    .join("\n");

  const customizations = getCustomizations();

  const menu = [...menuItems]
    .sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })
    .map((item) => {
      const itemCustomizations = customizations.filter((c) =>
        customizationAppliesTo(c, item.id)
      );
      const customizationText =
        itemCustomizations.length > 0
          ? ` | customizations: ${itemCustomizations
              .map(
                (c) =>
                  `${c.name} [id: ${c.id}]${
                    c.price_modifier > 0
                      ? ` (+${formatCurrency(c.price_modifier)})`
                      : ""
                  }`
              )
              .join(", ")}`
          : "";
      const availability =
        item.availability && item.availability !== "in_stock"
          ? ` | availability: ${menuItemAvailabilityLabel(item.availability)}`
          : "";
      return `- ${item.name} [id: ${item.id}] (${item.category}): ${formatCurrency(item.price)}, ${item.prep_time_minutes} min — ${item.description}${customizationText}${availability}`;
    })
    .join("\n");

  const customizationSummary =
    customizations.length > 0
      ? customizations
          .map((c) => {
            const scope =
              c.menu_item_ids.length === 0
                ? "all items"
                : c.menu_item_ids
                    .map(
                      (id) =>
                        menuItems.find((m) => m.id === id)?.name ?? id
                    )
                    .join(", ");
            const price =
              c.price_modifier > 0
                ? ` (+${formatCurrency(c.price_modifier)})`
                : "";
            return `- ${c.name} [id: ${c.id}]${price} — ${scope}${c.description ? ` — ${c.description}` : ""}`;
          })
          .join("\n")
      : "(none configured)";

  const faqText = getFaqs()
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

TAXES (for quote_order_total only — do not mention prices unless the customer asks):
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

MENU (prices are for your reference only — do NOT tell customers item prices unless they ask; use quote_order_total when they ask about cost):
${menu}

CUSTOMIZATIONS (pass customization_ids per line item — do not mention customization prices unless the customer asks):
${customizationSummary}

FAQs:
${faqText}
`.trim();
}
