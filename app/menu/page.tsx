"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MenuPhotoImport } from "@/components/forms/MenuPhotoImport";
import { MenuItemRow } from "@/components/menu/MenuItemRow";
import {
  MenuItemDragGhost,
  MenuItemDragPlaceholder,
} from "@/components/menu/MenuItemDragGhost";
import { formatCurrency } from "@/lib/utils/format";
import type { MenuItem } from "@/lib/data/deens-bistro";
import type { MenuItemAvailability } from "@/types/menu";

const NEW_CATEGORY = "__new__";

type FormState = {
  name: string;
  description: string;
  price: string;
  category: string;
  newCategory: string;
  prep_time_minutes: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  newCategory: "",
  prep_time_minutes: "10",
};

function toForm(item: MenuItem): FormState {
  return {
    name: item.name ?? "",
    description: item.description ?? "",
    price: String(item.price ?? 0),
    category: item.category ?? "",
    newCategory: "",
    prep_time_minutes: String(item.prep_time_minutes ?? 10),
  };
}

function groupByCategory(
  menu: MenuItem[],
  categories: string[]
): [string, MenuItem[]][] {
  const groups = new Map<string, MenuItem[]>();
  for (const category of categories) groups.set(category, []);
  for (const item of menu) {
    const key =
      categories.find(
        (c) => c.toLowerCase() === (item.category ?? "").toLowerCase()
      ) ?? item.category ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  // Keep empty categories visible so they can be renamed or deleted.
  return [...groups.entries()].map(([category, items]) => [
    category,
    [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  ]);
}

function reorderAtIndex(
  items: MenuItem[],
  dragId: string,
  insertIndex: number
): MenuItem[] {
  const fromIndex = items.findIndex((item) => item.id === dragId);
  if (fromIndex < 0) return items;

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  let target = insertIndex;
  if (fromIndex < target) target -= 1;
  next.splice(target, 0, moved);
  return next;
}

type DragSession = {
  itemId: string;
  category: string;
  item: MenuItem;
  items: MenuItem[];
  insertIndex: number;
  ghostX: number;
  ghostY: number;
  ghostWidth: number;
  ghostHeight: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
};

function buildDragDisplay(
  items: MenuItem[],
  dragId: string,
  insertIndex: number
): Array<{ type: "item"; item: MenuItem } | { type: "placeholder" }> {
  const entries: Array<{ type: "item"; item: MenuItem } | { type: "placeholder" }> =
    [];

  for (let index = 0; index < items.length; index++) {
    if (insertIndex === index) entries.push({ type: "placeholder" });
    if (items[index].id !== dragId) {
      entries.push({ type: "item", item: items[index] });
    }
  }

  if (insertIndex === items.length) entries.push({ type: "placeholder" });
  return entries;
}

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const categoryListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const formRef = useRef<HTMLDivElement>(null);

  const loadMenu = useCallback(async () => {
    const res = await fetch("/api/menu");
    if (res.ok) setMenu(await res.json());
  }, []);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  useEffect(() => {
    loadMenu();
    loadCategories();
  }, [loadMenu, loadCategories]);

  useEffect(() => {
    return () => {
      dragSessionRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  function scrollToForm() {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function startEdit(item: MenuItem) {
    setAdding(false);
    setEditingId(item.id);
    setForm(toForm(item));
    setMessage("");
    scrollToForm();
  }

  function startAdd() {
    setEditingId(null);
    setAdding(true);
    setForm({ ...emptyForm, category: categories[0] ?? "" });
    setMessage("");
    scrollToForm();
  }

  function cancelForm() {
    setEditingId(null);
    setAdding(false);
    setForm(emptyForm);
  }

  async function saveItem() {
    setSaving(true);
    setMessage("");

    const category =
      form.category === NEW_CATEGORY
        ? form.newCategory.trim()
        : form.category.trim();

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: category || "General",
      prep_time_minutes: Number(form.prep_time_minutes),
    };

    if (!payload.name || Number.isNaN(payload.price)) {
      setMessage("Name and a valid price are required.");
      setSaving(false);
      return;
    }
    if (form.category === NEW_CATEGORY && !category) {
      setMessage("Enter a name for the new category.");
      setSaving(false);
      return;
    }

    const isEditing = editingId !== null;
    const res = await fetch("/api/menu", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEditing ? { id: editingId, ...payload } : payload
      ),
    });

    if (res.ok) {
      await Promise.all([loadMenu(), loadCategories()]);
      cancelForm();
      setMessage("Saved. The AI will use these changes immediately.");
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Failed to save.");
    }
    setSaving(false);
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this menu item?")) return;

    const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadMenu();
      if (editingId === id) cancelForm();
      setMessage("Item deleted.");
    }
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNewCategoryName("");
      setAddingCategory(false);
      await loadCategories();
      setMessage(`Category "${name}" added.`);
    } else {
      setMessage(
        data.error ??
          (res.status >= 500
            ? "Server error — refresh the page and try again."
            : "Failed to add category.")
      );
    }
  }

  async function renameCategory() {
    const from = renamingCategory;
    const to = renameValue.trim();
    if (!from || !to || from === to) {
      setRenamingCategory(null);
      return;
    }

    const res = await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await Promise.all([loadCategories(), loadMenu()]);
      setMessage(`Renamed "${from}" to "${to}".`);
      setRenamingCategory(null);
    } else {
      setMessage(data.error ?? "Failed to rename category.");
    }
  }

  async function deleteCategory(name: string, count: number) {
    const warning =
      count > 0
        ? `Delete "${name}" and its ${count} menu item${count === 1 ? "" : "s"}? This cannot be undone.`
        : `Delete "${name}"?`;
    if (!confirm(warning)) return;

    const res = await fetch(
      `/api/categories?name=${encodeURIComponent(name)}`,
      { method: "DELETE" }
    );

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await Promise.all([loadCategories(), loadMenu()]);
      const deleted = data.deletedItemCount ?? 0;
      setMessage(
        deleted > 0
          ? `Category "${name}" and ${deleted} item${deleted === 1 ? "" : "s"} deleted.`
          : `Category "${name}" deleted.`
      );
    } else {
      setMessage(data.error ?? "Failed to delete category.");
    }
  }

  async function moveCategoryOrder(name: string, direction: "up" | "down") {
    const res = await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", name, direction }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCategories(data.categories ?? categories);
    } else {
      setMessage(data.error ?? "Failed to move category.");
    }
  }

  async function updateAvailability(
    id: string,
    availability: MenuItemAvailability
  ) {
    const res = await fetch(`/api/menu/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMenu((prev) => prev.map((item) => (item.id === id ? data : item)));
    } else {
      setMessage(data.error ?? "Failed to update availability.");
    }
  }

  async function commitDragReorder() {
    const session = dragSessionRef.current;
    dragSessionRef.current = null;
    setDragSession(null);

    if (!session) return;

    const { itemId, category, items, insertIndex } = session;
    const fromIndex = items.findIndex((item) => item.id === itemId);
    if (fromIndex < 0 || fromIndex === insertIndex) return;

    const reordered = reorderAtIndex(items, itemId, insertIndex);
    const orderMap = new Map(
      reordered.map((item, index) => [item.id, index])
    );

    setMenu((prev) =>
      prev.map((item) => {
        if (item.category.toLowerCase() !== category.toLowerCase()) return item;
        const sort_order = orderMap.get(item.id);
        if (sort_order === undefined) return item;
        return { ...item, sort_order };
      })
    );

    const res = await fetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder",
        category,
        itemIds: reordered.map((item) => item.id),
      }),
    });

    if (res.ok) {
      setMenu(await res.json());
    } else {
      await loadMenu();
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Failed to reorder items.");
    }
  }

  function getInsertIndexFromPointer(
    clientY: number,
    items: MenuItem[],
    dragId: string,
    listElement: HTMLElement
  ): number {
    const rows = listElement.querySelectorAll<HTMLElement>("[data-menu-item-row]");
    let insertIndex = items.length;

    for (const row of rows) {
      const rowId = row.dataset.itemId;
      if (!rowId) continue;

      const itemIndex = items.findIndex((item) => item.id === rowId);
      if (itemIndex < 0) continue;

      const rect = row.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        return itemIndex;
      }
      insertIndex = itemIndex + 1;
    }

    if (insertIndex === items.length) return items.length;
    return insertIndex;
  }

  function startPointerDrag(
    category: string,
    items: MenuItem[],
    item: MenuItem,
    event: React.PointerEvent<HTMLDivElement>,
    listElement: HTMLElement | null
  ) {
    if (!listElement) return;

    const listEl = listElement;
    const row = event.currentTarget;
    row.setPointerCapture(event.pointerId);
    const rect = row.getBoundingClientRect();
    const startIndex = items.findIndex((entry) => entry.id === item.id);
    const session: DragSession = {
      itemId: item.id,
      category,
      item,
      items,
      insertIndex: startIndex < 0 ? 0 : startIndex,
      ghostX: rect.left,
      ghostY: rect.top,
      ghostWidth: rect.width,
      ghostHeight: rect.height,
      pointerOffsetX: event.clientX - rect.left,
      pointerOffsetY: event.clientY - rect.top,
    };
    dragSessionRef.current = session;
    setDragSession(session);

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    function handlePointerMove(moveEvent: PointerEvent) {
      const insertIndex = getInsertIndexFromPointer(
        moveEvent.clientY,
        items,
        item.id,
        listEl
      );

      setDragSession((current) => {
        if (!current) return current;
        const next = {
          ...current,
          ghostX: moveEvent.clientX - current.pointerOffsetX,
          ghostY: moveEvent.clientY - current.pointerOffsetY,
          insertIndex,
        };
        dragSessionRef.current = next;
        return next;
      });
    }

    function handlePointerUp(endEvent: PointerEvent) {
      if (row.hasPointerCapture(endEvent.pointerId)) {
        row.releasePointerCapture(endEvent.pointerId);
      }
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      void commitDragReorder();
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);
  }

  const showForm = adding || editingId !== null;

  const filteredMenu = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return menu;

    return menu.filter((item) => {
      const haystack = [
        item.name,
        item.description,
        item.category,
        String(item.price),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [menu, searchQuery]);

  const grouped = useMemo(() => {
    const groups = groupByCategory(filteredMenu, categories);
    if (!searchQuery.trim()) return groups;
    return groups.filter(([, items]) => items.length > 0);
  }, [filteredMenu, categories, searchQuery]);

  const searchPlaceholder =
    menu.length === 1 ? "Search 1 item" : `Search ${menu.length} items`;

  return (
    <DashboardLayout>
      <PageHeader
        title="Menu"
        description="Edit items, prices, and prep times — the AI uses this live"
        action={
          !showForm ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowImport((v) => !v)}
              >
                Import from photo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setAddingCategory((v) => !v)}
              >
                Add category
              </Button>
              <Button type="button" size="sm" onClick={startAdd}>
                Add item
              </Button>
            </div>
          ) : undefined
        }
      />
      <div className="space-y-4 px-8 py-6">
        {message && <p className="text-sm text-stone-600">{message}</p>}

        <div className="relative">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-full bg-stone-100 py-3 pl-11 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>

        {addingCategory && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCategory();
                if (e.key === "Escape") setAddingCategory(false);
              }}
              autoFocus
              placeholder="Category name — e.g. Classics, Combos"
              className="w-64 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <Button
              type="button"
              size="sm"
              onClick={addCategory}
              disabled={!newCategoryName.trim()}
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setAddingCategory(false)}
            >
              Cancel
            </Button>
          </div>
        )}

        {showImport && (
          <MenuPhotoImport
            onImported={async () => {
              await Promise.all([loadMenu(), loadCategories()]);
              setMessage("Menu items imported.");
            }}
            onClose={() => setShowImport(false)}
          />
        )}

        {showForm && (
          <div ref={formRef}>
          <Card>
            <h2 className="mb-4 font-semibold">
              {editingId ? "Edit item" : "New item"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {!categories.some(
                    (c) => c.toLowerCase() === form.category.toLowerCase()
                  ) &&
                    form.category &&
                    form.category !== NEW_CATEGORY && (
                      <option value={form.category}>{form.category}</option>
                    )}
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>+ New category…</option>
                </select>
                {form.category === NEW_CATEGORY && (
                  <input
                    type="text"
                    value={form.newCategory}
                    onChange={(e) =>
                      setForm({ ...form, newCategory: e.target.value })
                    }
                    placeholder="Category name"
                    className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                )}
              </div>
              <Input
                label="Price ($)"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
              <Input
                label="Prep time (minutes)"
                type="number"
                min="0"
                value={form.prep_time_minutes}
                onChange={(e) =>
                  setForm({ ...form, prep_time_minutes: e.target.value })
                }
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                onClick={saveItem}
                disabled={saving || !form.name.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </Card>
          </div>
        )}

        {grouped.length === 0 && searchQuery.trim() && (
          <p className="py-8 text-center text-sm text-stone-500">
            No items match &ldquo;{searchQuery.trim()}&rdquo;
          </p>
        )}

        {grouped.map(([category, items]) => {
          const categoryIndex = categories.indexOf(category);
          const canMoveUp = categoryIndex > 0;
          const canMoveDown =
            categoryIndex >= 0 && categoryIndex < categories.length - 1;

          return (
          <Card key={category}>
            <div className="flex items-center justify-between gap-4">
              {renamingCategory === category ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameCategory();
                      if (e.key === "Escape") setRenamingCategory(null);
                    }}
                    autoFocus
                    className="w-56 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <Button type="button" size="sm" onClick={renameCategory}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setRenamingCategory(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="font-semibold text-stone-900">{category}</h2>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!canMoveUp}
                      onClick={() => moveCategoryOrder(category, "up")}
                      aria-label={`Move ${category} up`}
                      title="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!canMoveDown}
                      onClick={() => moveCategoryOrder(category, "down")}
                      aria-label={`Move ${category} down`}
                      title="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRenamingCategory(category);
                        setRenameValue(category);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCategory(category, items.length)}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
            {items.length === 0 && (
              <p className="mt-2 text-sm text-stone-400">No items yet.</p>
            )}
            <div
              ref={(element) => {
                categoryListRefs.current[category] = element;
              }}
              data-menu-list={category}
              className="divide-y divide-stone-100 overflow-x-auto"
            >
              {(dragSession?.category.toLowerCase() === category.toLowerCase()
                ? buildDragDisplay(
                    items,
                    dragSession.itemId,
                    dragSession.insertIndex
                  )
                : items.map((item) => ({ type: "item" as const, item }))
              ).map((entry, index) =>
                entry.type === "placeholder" ? (
                  <MenuItemDragPlaceholder
                    key={`placeholder-${index}`}
                    height={dragSession?.ghostHeight ?? 72}
                  />
                ) : (
                  <MenuItemRow
                    key={entry.item.id}
                    item={entry.item}
                    editing={editingId === entry.item.id}
                    dragDisabled={!!searchQuery.trim()}
                    onEdit={() => startEdit(entry.item)}
                    onDelete={() => deleteItem(entry.item.id)}
                    onAvailabilityChange={(availability) =>
                      updateAvailability(entry.item.id, availability)
                    }
                    onPointerDragStart={(event) =>
                      startPointerDrag(
                        category,
                        items,
                        entry.item,
                        event,
                        categoryListRefs.current[category]
                      )
                    }
                  />
                )
              )}
            </div>
          </Card>
          );
        })}
      </div>
      {dragSession && (
        <MenuItemDragGhost
          item={dragSession.item}
          editing={editingId === dragSession.itemId}
          x={dragSession.ghostX}
          y={dragSession.ghostY}
          width={dragSession.ghostWidth}
        />
      )}
    </DashboardLayout>
  );
}
