"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { VoiceSettings, ForwardingMode } from "@/lib/store/voice";

const MODE_LABELS: Record<ForwardingMode, string> = {
  backup: "Backup mode — forward on no-answer / busy only",
  full: "Full mode — forward all calls to the AI",
};

const FORWARDING_INSTRUCTIONS: Record<ForwardingMode, { carrier: string; code: string }[]> = {
  backup: [
    { carrier: "AT&T (mobile)", code: "*61*+1TWILIO_NUMBER# (no-answer)  and  *67*+1TWILIO_NUMBER# (busy)" },
    { carrier: "Verizon (mobile)", code: "Settings → Calls → Call Forwarding → Forward When Unanswered" },
    { carrier: "T-Mobile (mobile)", code: "**61*+1TWILIO_NUMBER**30# (no-answer, 30-sec delay)" },
    { carrier: "Comcast Business", code: "Admin portal → Call Forwarding → Busy/No-Answer" },
    { carrier: "Spectrum Business", code: "My Account → Voice → Call Forwarding → Busy/No-Answer" },
    { carrier: "Generic VoIP", code: "Admin portal → Hunt Groups or Selective Forwarding" },
  ],
  full: [
    { carrier: "AT&T (mobile)", code: "*21*+1TWILIO_NUMBER#" },
    { carrier: "Verizon (mobile)", code: "Settings → Calls → Call Forwarding → Always Forward" },
    { carrier: "T-Mobile (mobile)", code: "**21*+1TWILIO_NUMBER#" },
    { carrier: "Comcast Business", code: "Admin portal → Call Forwarding → Unconditional" },
    { carrier: "Spectrum Business", code: "My Account → Voice → Call Forwarding → Always" },
    { carrier: "Generic VoIP", code: "Admin portal → Call Forwarding → Always/Unconditional" },
  ],
};

export function VoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [mode, setMode] = useState<ForwardingMode>("backup");
  const [transferNumber, setTransferNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [twilioNumber, setTwilioNumber] = useState("");

  useEffect(() => {
    fetch("/api/voice/settings")
      .then((r) => r.json())
      .then((data: VoiceSettings) => {
        setSettings(data);
        setMode(data.mode);
        setTransferNumber(data.transfer_number);
      })
      .catch(console.error);

    // Get the Twilio number from an env-exposed endpoint (just for display).
    fetch("/api/restaurant")
      .then((r) => r.json())
      .then((data: { twilio_number?: string }) => {
        if (data.twilio_number) setTwilioNumber(data.twilio_number);
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/voice/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, transfer_number: transferNumber }),
      });
      const data = (await res.json()) as VoiceSettings & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to save settings");
      } else {
        setSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  const modeChanged = settings && mode !== settings.mode;
  const instructions = FORWARDING_INSTRUCTIONS[mode].map((row) => ({
    ...row,
    code: twilioNumber ? row.code.replace(/\+1TWILIO_NUMBER/g, twilioNumber) : row.code,
  }));

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Phone / Call Forwarding</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            How calls reach the AI and where staff transfers go
          </p>
        </div>
        {settings?.mode_verified && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Test call confirmed
          </span>
        )}
        {settings && !settings.mode_verified && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Awaiting test call
          </span>
        )}
      </div>

      <div className="space-y-5">
        {/* Forwarding mode */}
        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">
            Forwarding mode
          </label>
          <div className="space-y-2">
            {(["backup", "full"] as ForwardingMode[]).map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  mode === m
                    ? "border-teal-500 bg-teal-50"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="mt-0.5 accent-teal-600"
                />
                <div>
                  <p className="text-sm font-medium text-stone-800">{MODE_LABELS[m]}</p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {m === "backup"
                      ? "Staff answer when they can; the AI picks up missed calls."
                      : "The AI answers every call. Staff transfers go to the number below."}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Transfer number */}
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700">
            Staff transfer number
          </label>
          <Input
            type="tel"
            placeholder="+15405550199"
            value={transferNumber}
            onChange={(e) => setTransferNumber(e.target.value)}
          />
          <p className="mt-1 text-xs text-stone-400">
            Manager&apos;s cell or a second line. Must be different from your main number
            {mode === "full" ? " (Full mode loops if you use the same number)" : ""}.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved" : "Save voice settings"}
        </Button>
      </div>

      {/* Forwarding instructions */}
      <div className="mt-6 border-t border-stone-100 pt-5">
        <h3 className="mb-1 text-sm font-semibold text-stone-700">
          How to set up forwarding ({mode === "backup" ? "Backup" : "Full"} mode)
        </h3>
        {modeChanged && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            You changed the mode — save first, then update your carrier forwarding below.
            The old mode stays active until a test call confirms the new setup.
          </p>
        )}
        {twilioNumber && (
          <p className="mb-3 text-xs text-stone-500">
            Your Twilio number: <span className="font-mono font-medium text-stone-800">{twilioNumber}</span>
          </p>
        )}
        <div className="overflow-x-auto rounded-lg border border-stone-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="px-3 py-2 text-left font-medium text-stone-600">Carrier</th>
                <th className="px-3 py-2 text-left font-medium text-stone-600">How to forward</th>
              </tr>
            </thead>
            <tbody>
              {instructions.map((row, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-stone-700">{row.carrier}</td>
                  <td className="px-3 py-2 font-mono text-stone-600">{row.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          After setting up forwarding, call your main number to confirm. A ✓ will appear above once we detect the first forwarded call.
        </p>
      </div>
    </div>
  );
}
