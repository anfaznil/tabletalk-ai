"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export function HoursSettings() {
  const [hours, setHours] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/hours")
      .then((r) => r.json())
      .then(setHours);
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    setErrors({});

    const res = await fetch("/api/hours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hours),
    });

    const data = await res.json();

    if (res.ok) {
      setHours(data);
      setMessage(
        "Hours saved. The AI and closing rules use these immediately."
      );
    } else {
      if (data.hours) setHours(data.hours);
      setErrors(data.errors ?? {});
      setMessage("Some days couldn't be saved — check the format.");
    }
    setSaving(false);
  }

  return (
    <Card>
      <h2 className="font-semibold text-stone-900">Opening Hours</h2>
      <p className="mt-1 text-sm text-stone-500">
        Format: 11:00 AM – 9:00 PM (or &quot;Closed&quot;). Last order is 15
        minutes before closing.
      </p>

      <div className="mt-4 space-y-2">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm font-medium text-stone-700">
              {label}
            </span>
            <div className="flex-1">
              <input
                type="text"
                value={hours[key] ?? ""}
                onChange={(e) =>
                  setHours({ ...hours, [key]: e.target.value })
                }
                placeholder="11:00 AM – 9:00 PM"
                className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                  errors[key]
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-stone-300 focus:border-amber-500 focus:ring-amber-500"
                }`}
              />
              {errors[key] && (
                <p className="mt-0.5 text-xs text-red-600">{errors[key]}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save hours"}
        </Button>
        {message && <p className="text-sm text-stone-600">{message}</p>}
      </div>
    </Card>
  );
}
