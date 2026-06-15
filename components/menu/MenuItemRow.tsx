"use client";

import type { MenuItem } from "@/lib/data/deens-bistro";
import type { MenuItemAvailability } from "@/types/menu";
import {
  MenuItemRowActions,
  MenuItemRowBody,
} from "@/components/menu/MenuItemRowContent";

function isInteractiveDragTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest(
    'button, select, input, textarea, a, label, [data-no-drag="true"]'
  );
}

export function MenuItemRow({
  item,
  editing,
  dragDisabled = false,
  onEdit,
  onDelete,
  onAvailabilityChange,
  onPointerDragStart,
}: {
  item: MenuItem;
  editing: boolean;
  dragDisabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAvailabilityChange: (availability: MenuItemAvailability) => void;
  onPointerDragStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      data-menu-item-row
      data-item-id={item.id}
      onPointerDown={(event) => {
        if (dragDisabled || event.button !== 0 || isInteractiveDragTarget(event.target)) {
          return;
        }
        event.preventDefault();
        onPointerDragStart(event);
      }}
      className={`flex touch-none items-start gap-3 border border-transparent px-2 py-4 ${
        dragDisabled ? "" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      <MenuItemRowBody item={item} />
      <MenuItemRowActions
        item={item}
        editing={editing}
        interactive
        onEdit={onEdit}
        onDelete={onDelete}
        onAvailabilityChange={onAvailabilityChange}
      />
    </div>
  );
}
