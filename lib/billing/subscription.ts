import { prisma } from "@/lib/db/prisma";

export interface SubscriptionInfo {
  status: string;
  plan: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  minuteCap: number;
  minutesUsed: number;
  overageRateCents: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export async function getSubscription(restaurantId: string): Promise<SubscriptionInfo | null> {
  const row = await prisma.subscription.findUnique({ where: { restaurant_id: restaurantId } });
  if (!row) return null;
  return {
    status: row.status,
    plan: row.plan,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    minuteCap: row.minute_cap,
    minutesUsed: row.minutes_used,
    overageRateCents: row.overage_rate_cents,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
  };
}

/** Adds seconds to minutes_used. Returns updated minutes_used. */
export async function trackCallMinutes(
  restaurantId: string,
  durationSeconds: number
): Promise<number> {
  const minutes = Math.ceil(durationSeconds / 60);
  if (minutes <= 0) return 0;

  const row = await prisma.subscription.update({
    where: { restaurant_id: restaurantId },
    data: { minutes_used: { increment: minutes } },
    select: {
      minutes_used: true,
      minute_cap: true,
      restaurant: { select: { phone: true, name: true } },
    },
  });

  const used = row.minutes_used;
  const cap = row.minute_cap;
  const pct = cap > 0 ? (used / cap) * 100 : 0;

  // Send SMS alerts at 80% and 100% thresholds
  const ownerPhone = row.restaurant.phone;
  if (ownerPhone) {
    const prev = used - minutes;
    const prevPct = cap > 0 ? (prev / cap) * 100 : 0;

    if (prevPct < 80 && pct >= 80) {
      await sendUsageAlert(ownerPhone, row.restaurant.name, used, cap, 80);
    } else if (prevPct < 100 && pct >= 100) {
      await sendUsageAlert(ownerPhone, row.restaurant.name, used, cap, 100);
    }
  }

  return used;
}

async function sendUsageAlert(
  phone: string,
  restaurantName: string,
  used: number,
  cap: number,
  threshold: 80 | 100
): Promise<void> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioSid || !twilioToken || !fromNumber) return;

  const message =
    threshold === 80
      ? `TableTalk AI: ${restaurantName} has used ${used}/${cap} AI minutes this month (80%). Overage charges apply after ${cap} minutes.`
      : `TableTalk AI: ${restaurantName} has reached its ${cap}-minute AI call limit. Additional calls are billed at overage rates. Manage at tabletalk.ai/settings/billing`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const params = new URLSearchParams({ To: phone, From: fromNumber, Body: message });
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  } catch (err) {
    console.error("[billing] Usage alert SMS failed:", err);
  }
}
