"use client";

import { useState } from "react";
import type { SubscriptionInfo } from "@/lib/billing/subscription";

const STATUS_LABELS: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
};

const STATUS_COLORS: Record<string, string> = {
  trialing: "bg-teal-100 text-teal-700",
  active: "bg-green-100 text-green-700",
  past_due: "bg-amber-100 text-amber-700",
  canceled: "bg-stone-100 text-stone-500",
  unpaid: "bg-red-100 text-red-700",
};

function ProgressBar({ used, cap }: { used: number; cap: number }) {
  const pct = cap > 0 ? Math.min((used / cap) * 100, 100) : 0;
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-teal-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-stone-500 mb-1">
        <span>{used} min used</span>
        <span>{cap} min included</span>
      </div>
      <div className="h-2 w-full rounded-full bg-stone-100">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 80 && pct < 100 && (
        <p className="mt-1 text-xs text-amber-600">
          Approaching limit — additional minutes billed at $0.05/min
        </p>
      )}
      {pct >= 100 && (
        <p className="mt-1 text-xs text-red-600">
          Minute cap reached — calls are still answered but billed at overage rates
        </p>
      )}
    </div>
  );
}

export function BillingPanel({ sub }: { sub: SubscriptionInfo | null }) {
  const [loading, setLoading] = useState(false);

  async function handleManage() {
    setLoading(true);
    try {
      const endpoint =
        sub?.stripeSubscriptionId && sub.status !== "canceled"
          ? "/api/billing/portal"
          : "/api/billing/checkout";
      const res = await fetch(endpoint, { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.assign(data.url);
    } catch {
      // silently fail — user stays on page
    } finally {
      setLoading(false);
    }
  }

  if (!sub) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
        No subscription found. Contact support.
      </div>
    );
  }

  const trialDaysLeft =
    sub.status === "trialing" && sub.trialEndsAt
      ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  const isActive = sub.status === "active" || sub.status === "trialing";
  const ctaLabel =
    sub.stripeSubscriptionId && sub.status !== "canceled"
      ? "Manage billing"
      : sub.status === "trialing"
      ? "Add payment method"
      : "Reactivate plan";

  return (
    <div className="space-y-4">
      {/* Plan card */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-stone-900 capitalize">{sub.plan} plan</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[sub.status] ?? "bg-stone-100 text-stone-500"}`}
              >
                {STATUS_LABELS[sub.status] ?? sub.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-stone-500">$99/month · includes {sub.minuteCap} AI minutes</p>
          </div>
          <button
            onClick={handleManage}
            disabled={loading}
            className="rounded-md bg-[#36b38f] px-4 py-2 text-sm font-medium text-white hover:bg-[#2fa07f] disabled:opacity-50"
          >
            {loading ? "Loading…" : ctaLabel}
          </button>
        </div>

        {trialDaysLeft !== null && (
          <div className="mt-4 rounded-md bg-teal-50 px-4 py-3 text-sm text-teal-700">
            {trialDaysLeft > 0
              ? `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}. Add a payment method to continue after the trial.`
              : "Your free trial has ended. Add a payment method to keep your AI answering calls."}
          </div>
        )}

        {sub.status === "past_due" && (
          <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Your last payment failed. Please update your payment method to avoid service interruption.
          </div>
        )}

        {sub.currentPeriodEnd && isActive && (
          <p className="mt-4 text-xs text-stone-400">
            {sub.status === "trialing" ? "Trial ends" : "Next renewal"}:{" "}
            {sub.currentPeriodEnd.toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Usage card */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-stone-700">AI minutes this period</h3>
        <ProgressBar used={sub.minutesUsed} cap={sub.minuteCap} />
        {sub.minutesUsed > sub.minuteCap && (
          <p className="mt-3 text-xs text-stone-500">
            Overage: {sub.minutesUsed - sub.minuteCap} min ×{" "}
            ${(sub.overageRateCents / 100).toFixed(2)} ={" "}
            ${(((sub.minutesUsed - sub.minuteCap) * sub.overageRateCents) / 100).toFixed(2)} extra this period
          </p>
        )}
      </div>
    </div>
  );
}
