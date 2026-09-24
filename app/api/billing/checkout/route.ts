import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { getStripe, STRIPE_PRICE_ID } from "@/lib/billing/stripe";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const headersList = await headers();
  const origin = headersList.get("origin") ?? "http://localhost:3000";

  const stripe = getStripe();
  const restaurantId = session.restaurant_id;

  const sub = await prisma.subscription.findUnique({ where: { restaurant_id: restaurantId } });
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { name: true },
  });

  // Create or reuse Stripe customer
  let customerId = sub?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: restaurant?.name ?? session.restaurantSlug,
      metadata: { restaurant_id: restaurantId },
    });
    customerId = customer.id;
    await prisma.subscription.upsert({
      where: { restaurant_id: restaurantId },
      create: {
        restaurant_id: restaurantId,
        stripe_customer_id: customerId,
        plan: "standard",
        status: "trialing",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        minute_cap: 500,
        minutes_used: 0,
      },
      update: { stripe_customer_id: customerId },
    });
  }

  // If already has an active Stripe subscription, redirect to portal instead
  if (sub?.stripe_subscription_id && sub.status !== "canceled") {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings/billing`,
    });
    return NextResponse.json({ url: portal.url });
  }

  // Calculate trial end from existing trial_ends_at
  const trialEnd = sub?.trial_ends_at ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const trialEndUnix = Math.floor(trialEnd.getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_collection: trialEndUnix > now ? "if_required" : "always",
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    subscription_data:
      trialEndUnix > now
        ? { trial_end: trialEndUnix, metadata: { restaurant_id: restaurantId } }
        : { metadata: { restaurant_id: restaurantId } },
    success_url: `${origin}/settings/billing?checkout=success`,
    cancel_url: `${origin}/settings/billing`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
