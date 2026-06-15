"use client";

import { createPortal } from "react-dom";
import type { MenuItem } from "@/lib/data/deens-bistro";
import {
  MenuItemRowActions,
  MenuItemRowBody,
} from "@/components/menu/MenuItemRowContent";

export function MenuItemDragGhost({
  item,
  editing,
  x,
  y,
  width,
}: {
  item: MenuItem;
  editing: boolean;
  x: number;
  y: number;
  width: number;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed left-0 top-0 z-50 flex items-start gap-3 rounded-lg border border-stone-200 bg-white px-2 py-4 shadow-lg"
      style={{
        width,
        transform: `translate3d(${x}px, ${y}px, 0)`,
      }}
    >
      <MenuItemRowBody item={item} />
      <MenuItemRowActions item={item} editing={editing} interactive={false} />
    </div>,
    document.body
  );
}

export function MenuItemDragPlaceholder({ height }: { height: number }) {
  return (
    <div
      className="mx-2 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50/80"
      style={{ height: Math.max(height, 56) }}
      aria-hidden
    />
  );
}
