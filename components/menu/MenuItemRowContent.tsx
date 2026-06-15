"use client";

import type { MenuItem } from "@/lib/data/deens-bistro";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";
import {
  MENU_ITEM_AVAILABILITY_LABELS,
  type MenuItemAvailability,
} from "@/types/menu";

const availabilityStyles: Record<
  MenuItemAvailability,
  { dot: string; text: string }
> = {
  in_stock: { dot: "bg-emerald-500", text: "text-stone-700" },
  sold_out_today: { dot: "bg-amber-400", text: "text-stone-700" },
  sold_out_indefinitely: { dot: "bg-red-500", text: "text-stone-700" },
};

export function MenuItemRowActions({
  item,
  editing,
  interactive,
  onEdit,
  onDelete,
  onAvailabilityChange,
}: {
  item: MenuItem;
  editing: boolean;
  interactive: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAvailabilityChange?: (availability: MenuItemAvailability) => void;
}) {
  const availability = item.availability ?? "in_stock";
  const styles = availabilityStyles[availability];

  if (!interactive) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <div
          className={`relative rounded-lg border border-stone-200 bg-white py-2 pl-8 pr-8 text-sm ${styles.text}`}
        >
          <span
            className={`absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${styles.dot}`}
            aria-hidden
          />
          {MENU_ITEM_AVAILABILITY_LABELS[availability]}
        </div>
        <span className="inline-flex h-8 items-center rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-medium text-stone-700">
          Edit
        </span>
        <span className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-600">
          Delete
        </span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2" data-no-drag="true">
      <label className="sr-only" htmlFor={`availability-${item.id}`}>
        Availability for {item.name}
      </label>
      <div className="relative">
        <span
          className={`pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${styles.dot}`}
          aria-hidden
        />
        <select
          id={`availability-${item.id}`}
          value={availability}
          onChange={(event) =>
            onAvailabilityChange?.(event.target.value as MenuItemAvailability)
          }
          className={`appearance-none rounded-lg border border-stone-200 bg-white py-2 pl-8 pr-8 text-sm ${styles.text} focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
        >
          {(Object.keys(MENU_ITEM_AVAILABILITY_LABELS) as MenuItemAvailability[]).map(
            (value) => (
              <option key={value} value={value}>
                {MENU_ITEM_AVAILABILITY_LABELS[value]}
              </option>
            )
          )}
        </select>
      </div>

      <Button
        type="button"
        size="sm"
        variant={editing ? "primary" : "secondary"}
        onClick={onEdit}
      >
        Edit
      </Button>
      <Button type="button" size="sm" variant="danger" onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}

export function MenuItemRowBody({ item }: { item: MenuItem }) {
  return (
    <>
      <div
        aria-hidden
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded text-stone-400"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden
        >
          <rect x="2" y="3" width="12" height="1.5" rx="0.75" />
          <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-stone-900">{item.name}</p>
        <p className="text-sm text-stone-500">
          {formatCurrency(Number(item.price))} · {item.prep_time_minutes ?? 10}{" "}
          min
        </p>
        {item.description && (
          <p className="mt-1 text-sm text-stone-400">{item.description}</p>
        )}
      </div>
    </>
  );
}
