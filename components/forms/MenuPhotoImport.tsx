"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const MAX_FILE_BYTES = 6_000_000; // 6MB
const DEFAULT_PREP_MINUTES = "10";

type ReviewRow = {
  selected: boolean;
  name: string;
  description: string;
  price: string;
  category: string;
  prep_time_minutes: string;
};

export function MenuPhotoImport({
  onImported,
  onClose,
}: {
  onImported: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    setError("");
    setRows([]);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Image is too large — max 6MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function extractItems() {
    if (!image) return;
    setExtracting(true);
    setError("");

    const res = await fetch("/api/menu/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Failed to read the menu photo.");
    } else {
      setRows(
        (data.items as {
          name: string;
          description: string;
          price: number;
          category: string;
        }[]).map((item) => ({
          selected: true,
          name: item.name,
          description: item.description ?? "",
          price: String(item.price),
          category: item.category?.trim() || "General",
          prep_time_minutes: DEFAULT_PREP_MINUTES,
        }))
      );
    }
    setExtracting(false);
  }

  function updateRow(index: number, updates: Partial<ReviewRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row))
    );
  }

  async function importSelected() {
    const selected = rows.filter((row) => row.selected && row.name.trim());
    if (selected.length === 0) return;

    setImporting(true);
    setError("");

    let failures = 0;
    for (const row of selected) {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.name.trim(),
          description: row.description.trim(),
          price: Number(row.price) || 0,
          category: row.category.trim() || "General",
          prep_time_minutes: Number(row.prep_time_minutes) || 10,
        }),
      });
      if (!res.ok) failures++;
    }

    await onImported();
    setImporting(false);

    if (failures > 0) {
      setError(`${failures} item(s) failed to import.`);
    } else {
      onClose();
    }
  }

  const selectedCount = rows.filter((row) => row.selected).length;
  const inputClass =
    "w-full rounded-lg border border-stone-300 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-stone-900">Import from photo</h2>
          <p className="mt-1 text-sm text-stone-500">
            Upload a photo of your menu and we&apos;ll read the items off it.
            Review before adding — prep times default to 10 min.
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="block text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
        />
        {image && rows.length === 0 && (
          <Button
            type="button"
            size="sm"
            onClick={extractItems}
            disabled={extracting}
          >
            {extracting ? "Reading menu..." : "Extract items"}
          </Button>
        )}
      </div>

      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt="Menu preview"
          className="mt-3 max-h-48 rounded-lg border border-stone-200 object-contain"
        />
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {rows.length > 0 && (
        <div className="mt-4">
          <div className="hidden gap-2 px-1 pb-1 text-xs font-medium uppercase tracking-wide text-stone-400 sm:grid sm:grid-cols-[auto_1fr_5rem_8rem_5rem]">
            <span className="w-4" />
            <span>Item</span>
            <span>Price</span>
            <span>Category</span>
            <span>Prep</span>
          </div>
          <div className="divide-y divide-stone-100">
            {rows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 items-center gap-2 py-2 sm:grid-cols-[auto_1fr_5rem_8rem_5rem]"
              >
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(e) => updateRow(i, { selected: e.target.checked })}
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    className={inputClass}
                  />
                  {row.description && (
                    <p className="mt-0.5 truncate text-xs text-stone-400">
                      {row.description}
                    </p>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.price}
                  onChange={(e) => updateRow(i, { price: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={row.category}
                  onChange={(e) => updateRow(i, { category: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="number"
                  min="0"
                  value={row.prep_time_minutes}
                  onChange={(e) =>
                    updateRow(i, { prep_time_minutes: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Button
              type="button"
              onClick={importSelected}
              disabled={importing || selectedCount === 0}
            >
              {importing
                ? "Adding..."
                : `Add ${selectedCount} item${selectedCount === 1 ? "" : "s"} to menu`}
            </Button>
            <p className="text-xs text-stone-400">
              New categories are created automatically.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
