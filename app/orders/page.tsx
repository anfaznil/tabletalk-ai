"use client";

import { useEffect, useState, useCallback } from "react";
import { OwnerNav } from "@/components/layout/OwnerNav";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Order } from "@/lib/store/orders";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  return (
    <div className="min-h-screen bg-stone-50">
      <OwnerNav active="/orders" />

      <main className="mx-auto max-w-4xl space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Orders</h1>
            <p className="text-sm text-stone-500">
              Pickup orders · resets on server restart
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadOrders}>
            Refresh
          </Button>
        </div>
        <Card>
          {loading ? (
            <p className="py-8 text-center text-sm text-stone-500">
              Loading...
            </p>
          ) : (
            <OrdersTable orders={orders} />
          )}
        </Card>
      </main>
    </div>
  );
}
