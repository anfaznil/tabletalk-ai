"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getHistoricalOrders,
  getTodayCompletedOrders,
  getTodayInProgressOrders,
} from "@/lib/orders/stats";
import { ORDER_RETENTION_MONTHS, type Order } from "@/types/orders";

type Tab = "in_progress" | "completed" | "history";

const tabs: { id: Tab; label: string }[] = [
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "history", label: "History" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("in_progress");
  const [completingId, setCompletingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/orders");
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const inProgress = useMemo(
    () => getTodayInProgressOrders(orders),
    [orders]
  );
  const completed = useMemo(() => getTodayCompletedOrders(orders), [orders]);
  const history = useMemo(() => getHistoricalOrders(orders), [orders]);

  const visible =
    tab === "in_progress"
      ? inProgress
      : tab === "completed"
        ? completed
        : history;

  const emptyMessages: Record<Tab, string> = {
    in_progress: "No orders in progress today.",
    completed: "No completed orders today.",
    history: `No past orders on file. History is kept for ${ORDER_RETENTION_MONTHS} months.`,
  };

  async function markComplete(id: string) {
    setCompletingId(id);
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    if (res.ok) {
      await loadOrders();
      setTab("completed");
    }
    setCompletingId(null);
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Orders"
        description="Today's board resets each day. Past orders are kept for 12 months."
        action={
          <Button variant="secondary" size="sm" onClick={loadOrders}>
            Refresh
          </Button>
        }
      />
      <div className="px-8 py-6">
        <div className="mb-4 flex gap-1 border-b border-stone-200">
          {tabs.map((t) => {
            const count =
              t.id === "in_progress"
                ? inProgress.length
                : t.id === "completed"
                  ? completed.length
                  : history.length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "border-teal-600 text-teal-700"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-stone-400">({count})</span>
              </button>
            );
          })}
        </div>

        <Card>
          {loading ? (
            <p className="py-8 text-center text-sm text-stone-500">
              Loading...
            </p>
          ) : (
            <OrdersTable
              orders={visible}
              emptyMessage={emptyMessages[tab]}
              showCompleteAction={tab === "in_progress"}
              onComplete={markComplete}
              completingId={completingId}
              showDate={tab === "history"}
            />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
