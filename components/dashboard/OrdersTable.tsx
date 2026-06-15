import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { formatReadyBy } from "@/lib/orders/ready-time";
import type { Order } from "@/types/orders";

function displayReadyBy(order: Order): string {
  if (order.ready_by) {
    return formatReadyBy(order.ready_by);
  }
  const legacy = (order as Order & { expected_ready_at?: string })
    .expected_ready_at;
  if (legacy && !legacy.startsWith("in ")) return legacy;
  return "—";
}

function OrderItemsList({ order }: { order: Order }) {
  return (
    <ul className="space-y-1">
      {order.items.map((item, index) => {
        const mods =
          item.customizations?.length > 0
            ? ` (${item.customizations.map((c) => c.name).join(", ")})`
            : "";
        return (
          <li key={`${item.menu_item_id}-${index}`}>
            {item.quantity}× {item.item_name}
            {mods}
          </li>
        );
      })}
      {order.notes && (
        <li className="text-xs text-stone-400">{order.notes}</li>
      )}
    </ul>
  );
}

export function OrdersTable({
  orders,
  emptyMessage = 'No orders yet. Try the chat simulator — e.g. "I\'ll have a chicken over rice for pickup ASAP."',
  showCompleteAction = false,
  onComplete,
  completingId,
  showDate = false,
}: {
  orders: Order[];
  emptyMessage?: string;
  showCompleteAction?: boolean;
  onComplete?: (id: string) => void;
  completingId?: string | null;
  showDate?: boolean;
}) {
  if (!orders.length) {
    return (
      <p className="py-8 text-center text-sm text-stone-500">{emptyMessage}</p>
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
            <th className="pb-3 pr-4 font-medium">
              {showDate ? "Date" : "Placed"}
            </th>
            {showCompleteAction && (
              <th className="pb-3 font-medium">Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-stone-100">
              <td className="py-3 pr-4">
                <p className="font-medium">{order.customer_name}</p>
                {order.phone && (
                  <p className="text-xs text-stone-500">{order.phone}</p>
                )}
              </td>
              <td className="max-w-xs py-3 pr-4 text-stone-600">
                <OrderItemsList order={order} />
              </td>
              <td className="py-3 pr-4 font-medium">
                {formatCurrency(order.total ?? order.subtotal)}
              </td>
              <td className="py-3 pr-4 font-medium text-stone-900">
                {displayReadyBy(order)}
              </td>
              <td className="py-3 pr-4 text-stone-500">
                {formatDateTime(order.created_at)}
              </td>
              {showCompleteAction && (
                <td className="py-3">
                  {order.status !== "completed" ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onComplete?.(order.id)}
                      disabled={completingId === order.id}
                    >
                      {completingId === order.id
                        ? "Saving..."
                        : "Mark complete"}
                    </Button>
                  ) : (
                    <span className="text-xs font-medium text-teal-600">
                      Completed
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
