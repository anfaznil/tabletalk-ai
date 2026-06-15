"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { formatCurrency } from "@/lib/utils/format";
import type { MenuItem } from "@/lib/data/deens-bistro";

type Customization = {
  id: string;
  name: string;
  description: string;
  price_modifier: number;
  menu_item_ids: string[];
};

type FormState = {
  name: string;
  description: string;
  price_modifier: string;
  applies_to_all: boolean;
  menu_item_ids: string[];
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price_modifier: "0",
  applies_to_all: true,
  menu_item_ids: [],
};

function toForm(item: Customization): FormState {
  return {
    name: item.name,
    description: item.description,
    price_modifier: String(item.price_modifier),
    applies_to_all: item.menu_item_ids.length === 0,
    menu_item_ids: [...item.menu_item_ids],
  };
}

function scopeLabel(
  customization: Customization,
  menu: MenuItem[]
): string {
  if (customization.menu_item_ids.length === 0) return "All items";
  return customization.menu_item_ids
    .map((id) => menu.find((m) => m.id === id)?.name ?? id)
    .join(", ");
}

export default function CustomizationsPage() {
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const [custRes, menuRes] = await Promise.all([
      fetch("/api/customizations"),
      fetch("/api/menu"),
    ]);
    if (custRes.ok) setCustomizations(await custRes.json());
    if (menuRes.ok) setMenu(await menuRes.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function startAdd() {
    setEditingId(null);
    setAdding(true);
    setForm(emptyForm);
    setMessage("");
  }

  function startEdit(item: Customization) {
    setAdding(false);
    setEditingId(item.id);
    setForm(toForm(item));
    setMessage("");
  }

  function cancelForm() {
    setEditingId(null);
    setAdding(false);
    setForm(emptyForm);
  }

  function toggleMenuItem(id: string) {
    setForm((prev) => ({
      ...prev,
      menu_item_ids: prev.menu_item_ids.includes(id)
        ? prev.menu_item_ids.filter((x) => x !== id)
        : [...prev.menu_item_ids, id],
    }));
  }

  async function save() {
    const name = form.name.trim();
    if (!name) {
      setMessage("Name is required.");
      return;
    }
    if (!form.applies_to_all && form.menu_item_ids.length === 0) {
      setMessage("Pick at least one menu item, or choose all items.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      name,
      description: form.description.trim(),
      price_modifier: Number(form.price_modifier) || 0,
      menu_item_ids: form.applies_to_all ? [] : form.menu_item_ids,
    };

    const isEditing = editingId !== null;
    const res = await fetch("/api/customizations", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEditing ? { id: editingId, ...payload } : payload
      ),
    });

    if (res.ok) {
      await loadData();
      cancelForm();
      setMessage("Saved. The AI can use this immediately.");
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Failed to save.");
    }
    setSaving(false);
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this customization?")) return;

    const res = await fetch(`/api/customizations/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadData();
      if (editingId === id) cancelForm();
      setMessage("Customization deleted.");
    }
  }

  const showForm = adding || editingId !== null;

  return (
    <DashboardLayout>
      <PageHeader
        title="Customizations"
        description="Toppings, extras, and add-ons the AI can offer on orders"
        action={
          !showForm ? (
            <Button type="button" size="sm" onClick={startAdd}>
              Add customization
            </Button>
          ) : undefined
        }
      />
      <div className="space-y-4 px-8 py-6">
        {message && <p className="text-sm text-stone-600">{message}</p>}

        {showForm && (
          <Card>
            <h2 className="mb-4 font-semibold">
              {editingId ? "Edit customization" : "New customization"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Extra sauce, Lettuce, Extra protein"
              />
              <Input
                label="Extra charge ($)"
                type="number"
                step="0.01"
                min="0"
                value={form.price_modifier}
                onChange={(e) =>
                  setForm({ ...form, price_modifier: e.target.value })
                }
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Description (optional)"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  placeholder="Helps the AI know when to offer this — e.g. add-on for sandwiches"
                />
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-stone-700">
                Applies to
              </p>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="radio"
                  checked={form.applies_to_all}
                  onChange={() =>
                    setForm({
                      ...form,
                      applies_to_all: true,
                      menu_item_ids: [],
                    })
                  }
                  className="h-4 w-4 border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                All menu items
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="radio"
                  checked={!form.applies_to_all}
                  onChange={() =>
                    setForm({ ...form, applies_to_all: false })
                  }
                  className="h-4 w-4 border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                Specific items only
              </label>

              {!form.applies_to_all && (
                <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-3">
                  {menu.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 text-sm text-stone-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.menu_item_ids.includes(item.id)}
                        onChange={() => toggleMenuItem(item.id)}
                        className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
                      {item.name}
                      <span className="text-stone-400">({item.category})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                onClick={save}
                disabled={saving || !form.name.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <Card>
          {customizations.length === 0 ? (
            <p className="py-4 text-sm text-stone-400">
              No customizations yet. Add toppings or extras like &quot;Extra
              sauce&quot; or item-specific options for sandwiches.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {customizations.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">{item.name}</p>
                    <p className="text-sm text-stone-500">
                      {item.price_modifier > 0
                        ? `+${formatCurrency(item.price_modifier)} · `
                        : ""}
                      {scopeLabel(item, menu)}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-sm text-stone-400">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={editingId === item.id ? "primary" : "secondary"}
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => deleteItem(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
