/**
 * POST /api/billing/webhook
 * Stripe webhook handler — syncs subscription state to DB.
 * Must be excluded from the middleware auth matcher.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/billing/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripe_subscription_id: sub.id },
          data: { status: "canceled" },
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : (invoice.subscription as { id: string } | null)?.id;
        if (subId) {
          await prisma.subscription.updateMany({
            where: { stripe_subscription_id: subId },
            data: { status: "past_due" },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const restaurantId =
    (sub.metadata?.restaurant_id as string | undefined) ??
    (await resolveRestaurantFromCustomer(sub.customer as string));

  if (!restaurantId) {
    console.warn("[stripe webhook] no restaurant_id for subscription", sub.id);
    return;
  }

  const periodEnd = sub.items.data[0]?.current_period_end;

  await prisma.subscription.upsert({
    where: { restaurant_id: restaurantId },
    create: {
      restaurant_id: restaurantId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      status: sub.status,
      plan: "standard",
      trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000) : null,
      minute_cap: 500,
      minutes_used: 0,
      overage_rate_cents: 5,
    },
    update: {
      stripe_subscription_id: sub.id,
      status: sub.status,
      trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000) : null,
      minutes_used: sub.status === "active" ? 0 : undefined, // reset at renewal
    },
  });
}

async function resolveRestaurantFromCustomer(customerId: string): Promise<string | null> {
  const row = await prisma.subscription.findFirst({
    where: { stripe_customer_id: customerId },
    select: { restaurant_id: true },
  });
  return row?.restaurant_id ?? null;
}
