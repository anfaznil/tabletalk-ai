/**
 * SMS notifications via Twilio.
 * Silently no-ops when TWILIO_* env vars are not configured so the
 * app works without Twilio during local development.
 */

import type { Order } from "@/types/orders";
import type { Lead } from "@/lib/store/leads";
import { formatCurrency } from "@/lib/utils/format";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const ownerNumber = process.env.OWNER_PHONE_NUMBER;

  if (!accountSid || !authToken || !from || !ownerNumber) return null;

  // Dynamic import keeps the Twilio SDK out of the Next.js edge runtime.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Twilio = require("twilio") as (sid: string, token: string) => {
    messages: { create: (opts: Record<string, string>) => Promise<unknown> };
  };
  return { client: Twilio(accountSid, authToken), from, to: ownerNumber };
}

async function sendSms(body: string): Promise<void> {
  const twilio = getTwilioClient();
  if (!twilio) {
    // Log in dev so we can see what would be sent.
    if (process.env.NODE_ENV !== "production") {
      console.log("[sms:noop]", body);
    }
    return;
  }
  try {
    await twilio.client.messages.create({ body, from: twilio.from, to: twilio.to });
  } catch (err) {
    // Never let SMS failures surface to the customer.
    console.error("[sms] Failed to send:", err);
  }
}

/** Send an order ticket to the owner. */
export async function notifyOrderPlaced(order: Order): Promise<void> {
  const items = order.items
    .map((i) => {
      const mods =
        i.customizations?.length > 0
          ? ` (${i.customizations.map((c) => c.name).join(", ")})`
          : "";
      return `  ${i.quantity}x ${i.item_name}${mods}`;
    })
    .join("\n");

  const readyAt = order.ready_by
    ? new Date(order.ready_by).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: process.env.RESTAURANT_TIMEZONE ?? "America/New_York",
      })
    : "—";

  const body =
    `🧾 NEW ORDER — ${order.customer_name}` +
    (order.phone ? ` (${order.phone})` : "") +
    `\n${items}\nTotal: ${formatCurrency(order.total)}\nReady by: ${readyAt}` +
    (order.notes ? `\nNotes: ${order.notes}` : "");

  await sendSms(body);
}

/** Send a catering / large-order lead to the owner. */
export async function notifyLeadCaptured(lead: Lead): Promise<void> {
  const label = lead.lead_type === "catering" ? "CATERING" : "LARGE ORDER";
  const body =
    `📋 ${label} LEAD — ${lead.customer_name}` +
    (lead.phone ? ` (${lead.phone})` : "") +
    `\nDate: ${lead.event_date}\nGuests: ${lead.guest_count}` +
    (lead.notes ? `\nNotes: ${lead.notes}` : "");

  await sendSms(body);
}

/** (Optional) Send an order confirmation to the customer if they gave a number. */
export async function notifyCustomerOrderConfirmed(order: Order): Promise<void> {
  if (!order.phone) return;

  const twilio = getTwilioClient();
  if (!twilio) return;

  const readyAt = order.ready_by
    ? new Date(order.ready_by).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: process.env.RESTAURANT_TIMEZONE ?? "America/New_York",
      })
    : "";

  const storeName = process.env.STORE_NAME ?? "the restaurant";
  const items = order.items.map((i) => `${i.quantity}x ${i.item_name}`).join(", ");
  const body =
    `${storeName}: Your order (${items}) is confirmed.` +
    (readyAt ? ` Ready for pickup around ${readyAt}.` : "") +
    ` Reply STOP to opt out.`;

  try {
    await twilio.client.messages.create({ body, from: twilio.from, to: order.phone });
  } catch (err) {
    console.error("[sms] Customer confirmation failed:", err);
  }
}
