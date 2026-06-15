"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type StoreInfo = {
  name: string;
  phone: string;
  address: string;
  website: string;
  catering_available: boolean;
  logo_data_url: string | null;
};

const emptyInfo: StoreInfo = {
  name: "",
  phone: "",
  address: "",
  website: "",
  catering_available: false,
  logo_data_url: null,
};

const MAX_LOGO_FILE_BYTES = 1_000_000; // ~1MB

export function StoreInfoSettings() {
  const [info, setInfo] = useState<StoreInfo>(emptyInfo);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/restaurant")
      .then((r) => r.json())
      .then(setInfo);
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    setErrors({});

    const res = await fetch("/api/restaurant", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(info),
    });

    const data = await res.json();

    if (res.ok) {
      setInfo(data);
      setMessage("Store info saved. The AI uses these details immediately.");
    } else {
      if (data.info) setInfo(data.info);
      setErrors(data.errors ?? {});
      setMessage("Couldn't save — check the fields.");
    }
    setSaving(false);
  }

  function handleLogoFile(file: File | undefined) {
    setErrors((prev) => ({ ...prev, logo_data_url: "" }));
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        logo_data_url: "Please choose an image file.",
      }));
      return;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        logo_data_url: "Image is too large — max 1MB.",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setInfo((prev) => ({ ...prev, logo_data_url: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setInfo((prev) => ({ ...prev, logo_data_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Card>
      <h2 className="font-semibold text-stone-900">Store Info</h2>
      <p className="mt-1 text-sm text-stone-500">
        Name, contact, and location details the AI shares with customers.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Input
            label="Restaurant name"
            value={info.name}
            onChange={(e) => setInfo({ ...info, name: e.target.value })}
          />
          {errors.name && (
            <p className="mt-0.5 text-xs text-red-600">{errors.name}</p>
          )}
        </div>
        <Input
          label="Phone"
          value={info.phone}
          onChange={(e) => setInfo({ ...info, phone: e.target.value })}
          placeholder="(718) 555-0142"
        />
        <Input
          label="Address"
          value={info.address}
          onChange={(e) => setInfo({ ...info, address: e.target.value })}
        />
        <Input
          label="Website"
          value={info.website}
          onChange={(e) => setInfo({ ...info, website: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="mt-4">
        <p className="mb-1 text-sm font-medium text-stone-700">Logo</p>
        <div className="flex items-center gap-3">
          {info.logo_data_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.logo_data_url}
              alt="Store logo"
              className="h-14 w-14 rounded-full border border-stone-200 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-stone-300 text-xs text-stone-400">
              None
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoFile(e.target.files?.[0])}
              className="block text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
            />
            {info.logo_data_url && (
              <button
                type="button"
                onClick={removeLogo}
                className="mt-1 text-xs text-red-600 hover:underline"
              >
                Remove logo
              </button>
            )}
          </div>
        </div>
        {errors.logo_data_url && (
          <p className="mt-1 text-xs text-red-600">{errors.logo_data_url}</p>
        )}
        <p className="mt-1 text-xs text-stone-400">
          Shown in the chat header and next to AI replies. Max 1MB.
        </p>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={info.catering_available}
          onChange={(e) =>
            setInfo({ ...info, catering_available: e.target.checked })
          }
          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
        />
        Catering available
      </label>

      <div className="mt-4 flex items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save store info"}
        </Button>
        {message && <p className="text-sm text-stone-600">{message}</p>}
      </div>
    </Card>
  );
}
