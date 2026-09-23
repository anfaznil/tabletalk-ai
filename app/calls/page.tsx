"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import type { CallLogEntry } from "@/lib/store/call-logs";

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  completed: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Completed" },
  "no-answer": { dot: "bg-amber-400", text: "text-amber-700", label: "No answer" },
  busy: { dot: "bg-amber-400", text: "text-amber-700", label: "Busy" },
  failed: { dot: "bg-red-500", text: "text-red-700", label: "Failed" },
  "in-progress": { dot: "bg-sky-400", text: "text-sky-700", label: "In progress" },
};

const MODE_LABELS: Record<string, string> = {
  backup: "Backup",
  full: "Full",
  unknown: "—",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TranscriptPanel({ entry, onClose }: { entry: CallLogEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <p className="font-semibold text-stone-900">
              {entry.caller_number ?? "Unknown caller"}
            </p>
            <p className="text-xs text-stone-500">
              {formatDate(entry.started_at)} · {formatDuration(entry.duration_seconds)} · {MODE_LABELS[entry.mode]} mode
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            ✕
          </button>
        </div>
        <div className="max-h-96 space-y-3 overflow-y-auto px-5 py-4">
          {entry.transcript.length === 0 ? (
            <p className="text-sm text-stone-400">No transcript available.</p>
          ) : (
            entry.transcript.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "assistant"
                      ? "bg-stone-100 text-stone-800"
                      : "bg-teal-600 text-white"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
        {entry.recording_url && (
          <div className="border-t border-stone-100 px-5 py-3">
            <a
              href={entry.recording_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-teal-600 hover:underline"
            >
              Listen to recording →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CallsPage() {
  const [logs, setLogs] = useState<CallLogEntry[]>([]);
  const [selected, setSelected] = useState<CallLogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/call-logs");
      const data = (await res.json()) as CallLogEntry[];
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Call Log"
        description="Every call that reached the AI — transcript, duration, and routing mode"
      />

      <div className="px-8 py-6">
        {loading ? (
          <p className="text-sm text-stone-400">Loading…</p>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 px-6 py-12 text-center">
            <p className="text-sm font-medium text-stone-500">No calls yet</p>
            <p className="mt-1 text-xs text-stone-400">
              Calls will appear here once you have Twilio configured and forwarding set up.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs font-medium text-stone-500">
                  <th className="px-4 py-3">Caller</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Transfer</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const s = STATUS_STYLES[log.status] ?? STATUS_STYLES.completed;
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-stone-100 last:border-0 hover:bg-stone-50"
                    >
                      <td className="px-4 py-3 font-mono text-stone-700">
                        {log.caller_number ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-stone-500">{formatDate(log.started_at)}</td>
                      <td className="px-4 py-3 text-stone-500">{MODE_LABELS[log.mode]}</td>
                      <td className="px-4 py-3 text-stone-500">
                        {formatDuration(log.duration_seconds)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1.5 ${s.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {log.transfer_attempted
                          ? log.transfer_answered
                            ? "Answered"
                            : "Not answered"
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(log)}
                          className="text-xs font-medium text-teal-600 hover:underline"
                        >
                          Transcript
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <TranscriptPanel entry={selected} onClose={() => setSelected(null)} />
      )}
    </DashboardLayout>
  );
}
