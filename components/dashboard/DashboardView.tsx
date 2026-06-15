"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  computeTodayStats,
  getRecentOrders,
  getTimeGreeting,
} from "@/lib/orders/stats";
import { formatCurrency } from "@/lib/utils/format";
import type { Order } from "@/types/orders";

function formatUpdatedAgo(updatedAt: Date): string {
  const seconds = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds === 1) return "1 second ago";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return "1 minute ago";
  return `${minutes} minutes ago`;
}

export function DashboardView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/orders");
    if (res.ok) {
      setOrders(await res.json());
      setUpdatedAt(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const refresh = setInterval(loadOrders, 5000);
    const tick = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [loadOrders]);

  const stats = computeTodayStats(orders);
  const recent = getRecentOrders(orders);
  const greeting = getTimeGreeting();

  return (
    <div className="px-8 py-8">
      <p className="text-sm text-stone-500">{greeting}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
        Today&apos;s summary
      </h1>
      <p className="mt-1 text-sm text-stone-400">
        {loading
          ? "Loading..."
          : updatedAt
            ? `Last updated ${formatUpdatedAgo(updatedAt)}`
            : ""}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sales"
          value={formatCurrency(stats.sales)}
          description="Total value of items sold"
        />
        <StatCard
          label="Booked Orders"
          value={String(stats.orderCount)}
          description="Orders that generated sales"
        />
        <StatCard
          label="Average ticket size"
          value={formatCurrency(stats.averageTicket)}
          description="Average value of items sold per order"
        />
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">Recent orders</h2>
          <Link href="/orders">
            <Button variant="secondary" size="sm">
              View all
            </Button>
          </Link>
        </div>
        <Card>
          {loading ? (
            <p className="py-8 text-center text-sm text-stone-500">
              Loading orders...
            </p>
          ) : (
            <OrdersTable orders={recent} />
          )}
        </Card>
      </div>
    </div>
  );
}
