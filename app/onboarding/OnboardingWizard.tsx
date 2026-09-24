"use client";

import { FormEvent, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  name: string;
  phone: string;
  address: string;
  website: string;
}

interface MenuItemDraft {
  name: string;
  price: string;
  category: string;
  prep_time_minutes: string;
}

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

type HoursData = Record<DayKey, { open: boolean; from: string; to: string }>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyHours(): HoursData {
  const base: Partial<HoursData> = {};
  for (const { key } of DAYS) {
    base[key] = { open: false, from: "11:00", to: "22:00" };
  }
  return base as HoursData;
}

function toHoursPayload(hours: HoursData): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const { key } of DAYS) {
    const d = hours[key];
    out[key] = d.open ? `${d.from}-${d.to}` : null;
  }
  return out;
}

// ─── Step components ─────────────────────────────────────────────────────────

function StepProfile({
  data,
  onChange,
  onNext,
  error,
  loading,
}: {
  data: ProfileData;
  onChange: (d: ProfileData) => void;
  onNext: () => void;
  error: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 uppercase tracking-wide">Restaurant Name</label>
        <input
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          required
          className="input-base"
          placeholder="Deen's Bistro"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 uppercase tracking-wide">Phone</label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          className="input-base"
          placeholder="+1 212 555 0100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 uppercase tracking-wide">Address</label>
        <input
          value={data.address}
          onChange={(e) => onChange({ ...data, address: e.target.value })}
          className="input-base"
          placeholder="123 Main St, New York, NY 10001"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 uppercase tracking-wide">Website</label>
        <input
          type="url"
          value={data.website}
          onChange={(e) => onChange({ ...data, website: e.target.value })}
          className="input-base"
          placeholder="https://deensbistro.com"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={onNext} disabled={loading || !data.name.trim()} className="btn-primary w-full">
        {loading ? "Saving…" : "Continue →"}
      </button>
    </div>
  );
}

function StepMenu({
  items,
  onAdd,
  onRemove,
  draft,
  onDraftChange,
  onNext,
  onBack,
  error,
  loading,
}: {
  items: MenuItemDraft[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  draft: MenuItemDraft;
  onDraftChange: (d: MenuItemDraft) => void;
  onNext: () => void;
  onBack: () => void;
  error: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-500">Add at least one item so your AI knows what you sell.</p>

      {items.length > 0 && (
        <ul className="divide-y divide-stone-100 rounded border border-stone-200 text-sm">
          {items.map((item, i) => (
            <li key={i} className="flex items-center justify-between px-3 py-2">
              <span>
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-stone-400">{item.category || "Uncategorized"}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-stone-600">${item.price}</span>
                <button onClick={() => onRemove(i)} className="text-red-400 hover:text-red-600">✕</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input
            value={draft.name}
            onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
            className="input-base"
            placeholder="Item name (e.g. Cheeseburger)"
          />
        </div>
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.price}
          onChange={(e) => onDraftChange({ ...draft, price: e.target.value })}
          className="input-base"
          placeholder="Price"
        />
        <input
          type="number"
          min="1"
          value={draft.prep_time_minutes}
          onChange={(e) => onDraftChange({ ...draft, prep_time_minutes: e.target.value })}
          className="input-base"
          placeholder="Prep (min)"
        />
        <div className="col-span-2">
          <input
            value={draft.category}
            onChange={(e) => onDraftChange({ ...draft, category: e.target.value })}
            className="input-base"
            placeholder="Category (e.g. Burgers, Drinks)"
          />
        </div>
      </div>

      <button
        onClick={onAdd}
        disabled={!draft.name.trim() || !draft.price}
        className="w-full rounded border-2 border-dashed border-teal-300 py-2 text-sm text-teal-600 hover:border-teal-500 disabled:opacity-40"
      >
        + Add item
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button
          onClick={onNext}
          disabled={loading || items.length === 0}
          className="btn-primary flex-1"
        >
          {loading ? "Saving…" : "Continue →"}
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-center text-xs text-stone-400">Add at least one item to continue</p>
      )}
    </div>
  );
}

function StepHours({
  hours,
  onChange,
  onNext,
  onBack,
  error,
  loading,
}: {
  hours: HoursData;
  onChange: (h: HoursData) => void;
  onNext: () => void;
  onBack: () => void;
  error: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">Set your opening hours so the AI can warn callers about closing time.</p>
      <div className="divide-y divide-stone-100 rounded border border-stone-200">
        {DAYS.map(({ key, label }) => {
          const d = hours[key];
          return (
            <div key={key} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <input
                type="checkbox"
                checked={d.open}
                onChange={(e) => onChange({ ...hours, [key]: { ...d, open: e.target.checked } })}
                className="accent-teal-500"
              />
              <span className="w-24 font-medium text-stone-700">{label}</span>
              {d.open ? (
                <>
                  <input
                    type="time"
                    value={d.from}
                    onChange={(e) => onChange({ ...hours, [key]: { ...d, from: e.target.value } })}
                    className="rounded border border-stone-200 px-2 py-1 text-xs"
                  />
                  <span className="text-stone-400">–</span>
                  <input
                    type="time"
                    value={d.to}
                    onChange={(e) => onChange({ ...hours, [key]: { ...d, to: e.target.value } })}
                    className="rounded border border-stone-200 px-2 py-1 text-xs"
                  />
                </>
              ) : (
                <span className="text-stone-400 italic">Closed</span>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={onNext} disabled={loading} className="btn-primary flex-1">
          {loading ? "Saving…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

function StepVoice({
  transferNumber,
  onTransferChange,
  mode,
  onModeChange,
  twilioNumber,
  onFinish,
  onBack,
  error,
  loading,
}: {
  transferNumber: string;
  onTransferChange: (v: string) => void;
  mode: "backup" | "full";
  onModeChange: (v: "backup" | "full") => void;
  twilioNumber: string | null;
  onFinish: () => void;
  onBack: () => void;
  error: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-500">
        TableTalk AI answers calls on a Twilio number. Forward your restaurant&apos;s line to it, or use it as your main number.
      </p>

      {twilioNumber && (
        <div className="rounded bg-teal-50 px-4 py-3 text-sm">
          <p className="font-medium text-teal-800">Your AI phone number</p>
          <p className="mt-0.5 font-mono text-lg text-teal-700">{twilioNumber}</p>
          <p className="mt-1 text-xs text-teal-600">Forward your restaurant line to this number — or give it to customers directly.</p>
        </div>
      )}

      {!twilioNumber && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No Twilio number configured yet. Add <code className="font-mono text-xs">TWILIO_PHONE_NUMBER</code> to your environment variables to display your AI number here.
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 uppercase tracking-wide">
          Staff transfer number
        </label>
        <input
          type="tel"
          value={transferNumber}
          onChange={(e) => onTransferChange(e.target.value)}
          className="input-base"
          placeholder="+1 212 555 0199 (manager's cell)"
        />
        <p className="mt-1 text-xs text-stone-400">When a caller asks to speak with a person, the AI will transfer here.</p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600 uppercase tracking-wide">
          Forwarding mode
        </label>
        <div className="space-y-2">
          {(["backup", "full"] as const).map((m) => (
            <label key={m} className="flex cursor-pointer items-start gap-3 rounded border border-stone-200 px-3 py-2.5 hover:bg-stone-50">
              <input
                type="radio"
                name="mode"
                checked={mode === m}
                onChange={() => onModeChange(m)}
                className="mt-0.5 accent-teal-500"
              />
              <div>
                <p className="text-sm font-medium text-stone-800 capitalize">{m}</p>
                <p className="text-xs text-stone-500">
                  {m === "backup"
                    ? "AI only answers when your staff line isn't picked up after a few rings."
                    : "AI answers every call — staff transfer is still available on request."}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={onFinish} disabled={loading} className="btn-primary flex-1">
          {loading ? "Saving…" : "Finish setup →"}
        </button>
      </div>
    </div>
  );
}

function StepDone() {
  return (
    <div className="space-y-6 text-center">
      <div className="text-5xl">🎉</div>
      <div>
        <h2 className="text-xl font-bold text-stone-900">You&apos;re live!</h2>
        <p className="mt-2 text-sm text-stone-500">
          Your AI is ready to take calls. Head to the dashboard to manage your menu, view orders, and see call logs.
        </p>
      </div>
      <a href="/" className="btn-primary inline-block w-full text-center">
        Go to Dashboard →
      </a>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

const STEPS = ["Profile", "Menu", "Hours", "Voice"];

export function OnboardingWizard({ twilioNumber }: { twilioNumber: string | null }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1
  const [profile, setProfile] = useState<ProfileData>({ name: "", phone: "", address: "", website: "" });

  // Step 2
  const emptyDraft: MenuItemDraft = { name: "", price: "", category: "", prep_time_minutes: "10" };
  const [menuItems, setMenuItems] = useState<MenuItemDraft[]>([]);
  const [draft, setDraft] = useState<MenuItemDraft>(emptyDraft);

  // Step 3
  const [hours, setHours] = useState<HoursData>(emptyHours);

  // Step 4
  const [transferNumber, setTransferNumber] = useState("");
  const [mode, setMode] = useState<"backup" | "full">("backup");

  async function apiPatch(url: string, body: unknown): Promise<boolean> {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  async function saveProfile() {
    setLoading(true);
    setError("");
    try {
      const ok = await apiPatch("/api/restaurant", profile);
      if (!ok) { setError("Couldn't save profile. Please try again."); return false; }
      return true;
    } catch { setError("Network error."); return false; }
    finally { setLoading(false); }
  }

  async function saveMenu() {
    setLoading(true);
    setError("");
    try {
      for (const item of menuItems) {
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            price: parseFloat(item.price),
            category: item.category || "Main",
            prep_time_minutes: parseInt(item.prep_time_minutes, 10) || 10,
          }),
        });
        if (!res.ok) { setError("Couldn't save menu item."); return false; }
      }
      return true;
    } catch { setError("Network error."); return false; }
    finally { setLoading(false); }
  }

  async function saveHours() {
    setLoading(true);
    setError("");
    try {
      const ok = await apiPatch("/api/hours", toHoursPayload(hours));
      if (!ok) { setError("Couldn't save hours."); return false; }
      return true;
    } catch { setError("Network error."); return false; }
    finally { setLoading(false); }
  }

  async function saveVoice() {
    setLoading(true);
    setError("");
    try {
      const ok = await apiPatch("/api/voice/settings", {
        transfer_number: transferNumber,
        mode,
      });
      if (!ok) { setError("Couldn't save voice settings."); return false; }
      return true;
    } catch { setError("Network error."); return false; }
    finally { setLoading(false); }
  }

  async function handleNext() {
    if (step === 0) { if (await saveProfile()) setStep(1); }
    else if (step === 1) { if (await saveMenu()) setStep(2); }
    else if (step === 2) { if (await saveHours()) setStep(3); }
    else if (step === 3) { if (await saveVoice()) setStep(4); }
  }

  function addDraftItem() {
    if (!draft.name.trim() || !draft.price) return;
    setMenuItems([...menuItems, draft]);
    setDraft(emptyDraft);
  }

  if (step === 4) return <StepDone />;

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i < step
                  ? "bg-teal-500 text-white"
                  : i === step
                  ? "border-2 border-teal-500 bg-white text-teal-600"
                  : "bg-stone-200 text-stone-400"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-[10px] font-medium ${i === step ? "text-teal-600" : "text-stone-400"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <StepProfile data={profile} onChange={setProfile} onNext={handleNext} error={error} loading={loading} />
      )}
      {step === 1 && (
        <StepMenu
          items={menuItems}
          onAdd={addDraftItem}
          onRemove={(i) => setMenuItems(menuItems.filter((_, idx) => idx !== i))}
          draft={draft}
          onDraftChange={setDraft}
          onNext={handleNext}
          onBack={() => { setError(""); setStep(0); }}
          error={error}
          loading={loading}
        />
      )}
      {step === 2 && (
        <StepHours
          hours={hours}
          onChange={setHours}
          onNext={handleNext}
          onBack={() => { setError(""); setStep(1); }}
          error={error}
          loading={loading}
        />
      )}
      {step === 3 && (
        <StepVoice
          transferNumber={transferNumber}
          onTransferChange={setTransferNumber}
          mode={mode}
          onModeChange={setMode}
          twilioNumber={twilioNumber}
          onFinish={handleNext}
          onBack={() => { setError(""); setStep(2); }}
          error={error}
          loading={loading}
        />
      )}
    </div>
  );
}
