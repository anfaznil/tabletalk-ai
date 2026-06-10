"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { OwnerNav } from "@/components/layout/OwnerNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { HoursSettings } from "@/components/forms/HoursSettings";
import { TaxSettings } from "@/components/forms/TaxSettings";
import { formatCurrency } from "@/lib/utils/format";
import type { MenuItem } from "@/lib/data/deens-bistro";

type FormState = {
  name: string;
  description: string;
  price: string;
  category: string;
  prep_time_minutes: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  prep_time_minutes: "10",
};

function toForm(item: MenuItem): FormState {
  return {
    name: item.name ?? "",
    description: item.description ?? "",
    price: String(item.price ?? 0),
    category: item.category ?? "",
    prep_time_minutes: String(item.prep_time_minutes ?? 10),
  };
}

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const loadMenu = useCallback(async () => {
    const res = await fetch("/api/menu");
    if (res.ok) setMenu(await res.json());
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

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
    setForm(emptyForm);
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

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category.trim() || "General",
      prep_time_minutes: Number(form.prep_time_minutes),
    };

    if (!payload.name || Number.isNaN(payload.price)) {
      setMessage("Name and a valid price are required.");
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
      await loadMenu();
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

  const showForm = adding || editingId !== null;

  return (
    <div className="min-h-screen bg-stone-50">
      <OwnerNav active="/menu" />

      <main className="mx-auto max-w-4xl space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Menu</h1>
            <p className="text-sm text-stone-500">
              Edit items, prices, and prep times — the AI uses this live.
            </p>
          </div>
          {!showForm && (
            <Button type="button" size="sm" onClick={startAdd}>
              Add item
            </Button>
          )}
        </div>

        {message && <p className="text-sm text-stone-600">{message}</p>}

        <HoursSettings />

        <TaxSettings />

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
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Plates, Drinks..."
              />
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

        <Card>
          <div className="divide-y divide-stone-100">
            {menu.map((item) => (
              <div key={item.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">{item.name}</p>
                    <p className="text-sm text-stone-500">
                      {item.category} · {formatCurrency(Number(item.price))} ·{" "}
                      {item.prep_time_minutes ?? 10} min
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
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
