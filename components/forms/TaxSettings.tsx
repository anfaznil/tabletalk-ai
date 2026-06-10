"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TaxConfig {
  food_beverage_tax_percent: number;
  sales_tax_percent: number;
}

export function TaxSettings() {
  const [taxes, setTaxes] = useState<TaxConfig>({
    food_beverage_tax_percent: 6,
    sales_tax_percent: 5.3,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/taxes")
      .then((r) => r.json())
      .then(setTaxes);
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/taxes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taxes),
    });

    if (res.ok) {
      setTaxes(await res.json());
      setMessage("Tax rates saved. Totals will include these automatically.");
    } else {
      setMessage("Failed to save tax rates.");
    }
    setSaving(false);
  }

  const combined =
    taxes.food_beverage_tax_percent + taxes.sales_tax_percent;

  return (
    <Card>
      <h2 className="font-semibold text-stone-900">Taxes</h2>
      <p className="mt-1 text-sm text-stone-500">
        Applied to all orders. Customers see one total — no breakdown.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          label="Food & beverage tax (%)"
          type="number"
          step="0.1"
          min="0"
          value={taxes.food_beverage_tax_percent}
          onChange={(e) =>
            setTaxes({
              ...taxes,
              food_beverage_tax_percent: Number(e.target.value),
            })
          }
        />
        <Input
          label="Sales tax (%)"
          type="number"
          step="0.1"
          min="0"
          value={taxes.sales_tax_percent}
          onChange={(e) =>
            setTaxes({
              ...taxes,
              sales_tax_percent: Number(e.target.value),
            })
          }
        />
      </div>

      <p className="mt-2 text-xs text-stone-500">
        Combined rate: {combined}% — e.g. $40 order → $
        {((40 * (1 + combined / 100)).toFixed(2))} total
      </p>

      <div className="mt-4 flex items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save taxes"}
        </Button>
        {message && <p className="text-sm text-stone-600">{message}</p>}
      </div>
    </Card>
  );
}
