import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { formatReadyBy } from "@/lib/orders/ready-time";
import type { Order } from "@/lib/store/orders";

function displayReadyBy(order: Order): string {
  if (order.ready_by) {
    return formatReadyBy(order.ready_by);
  }
  // Legacy orders
  const legacy = (order as Order & { expected_ready_at?: string }).expected_ready_at;
  if (legacy && !legacy.startsWith("in ")) return legacy;
  return "—";
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  if (!orders.length) {
    return (
      <p className="py-8 text-center text-sm text-stone-500">
        No orders yet. Try the chat simulator — e.g. &quot;I&apos;ll have a
        chicken over rice for pickup ASAP.&quot;
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500">
            <th className="pb-3 pr-4 font-medium">Customer</th>
            <th className="pb-3 pr-4 font-medium">Items</th>
            <th className="pb-3 pr-4 font-medium">Total</th>
            <th className="pb-3 pr-4 font-medium">Ready by</th>
            <th className="pb-3 pr-4 font-medium">Size</th>
            <th className="pb-3 font-medium">Placed</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const itemSummary = order.items
              .map((i) => `${i.quantity}× ${i.item_name}`)
              .join(", ");

            return (
              <tr key={order.id} className="border-b border-stone-100">
                <td className="py-3 pr-4">
                  <p className="font-medium">{order.customer_name}</p>
                  {order.phone && (
                    <p className="text-xs text-stone-500">{order.phone}</p>
                  )}
                </td>
                <td className="max-w-xs py-3 pr-4 text-stone-600">
                  {itemSummary}
                  {order.notes && (
                    <p className="mt-0.5 text-xs text-stone-400">
                      {order.notes}
                    </p>
                  )}
                </td>
                <td className="py-3 pr-4 font-medium">
                  {formatCurrency(order.total ?? order.subtotal)}
                </td>
                <td className="py-3 pr-4 font-medium text-stone-900">
                  {displayReadyBy(order)}
                </td>
                <td className="py-3 pr-4">
                  <Badge
                    color={order.order_size === "large" ? "warning" : "default"}
                  >
                    {order.order_size}
                  </Badge>
                </td>
                <td className="py-3 text-stone-500">
                  {formatDateTime(order.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
