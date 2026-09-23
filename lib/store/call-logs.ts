/**
 * Call log store — one entry per completed Twilio call.
 * Stored in the same JSON persistence layer as orders/leads.
 */

import { loadPersisted, savePersisted } from "@/lib/store/persist";
import type { ForwardingMode } from "@/lib/store/voice";

export interface CallLogEntry {
  id: string;
  call_sid: string;
  caller_number: string | null;
  mode: ForwardingMode | "unknown";
  status: "completed" | "no-answer" | "busy" | "failed" | "in-progress";
  duration_seconds: number;
  /** UTC ISO timestamp of when the call started. */
  started_at: string;
  /** UTC ISO timestamp of when the call ended. */
  ended_at: string | null;
  /** Transcript: alternating user/assistant messages from the session. */
  transcript: { role: "user" | "assistant"; content: string }[];
  /** True if a staff transfer was attempted. */
  transfer_attempted: boolean;
  /** True if the transfer was answered. */
  transfer_answered: boolean;
  /** Recording URL from Twilio (populated when available). */
  recording_url: string | null;
}

const globalStore = globalThis as unknown as { callLogs: CallLogEntry[] };

if (!globalStore.callLogs) {
  globalStore.callLogs = loadPersisted("callLogs", () => []);
}

function persist() {
  savePersisted("callLogs", globalStore.callLogs);
}

export function addCallLog(entry: Omit<CallLogEntry, "id">): CallLogEntry {
  const log: CallLogEntry = { ...entry, id: crypto.randomUUID() };
  globalStore.callLogs.unshift(log);
  // Keep the most recent 500 calls.
  if (globalStore.callLogs.length > 500) {
    globalStore.callLogs = globalStore.callLogs.slice(0, 500);
  }
  persist();
  return log;
}

export function getCallLogs(limit = 50): CallLogEntry[] {
  return globalStore.callLogs.slice(0, limit);
}

export function getCallLogByCallSid(callSid: string): CallLogEntry | undefined {
  return globalStore.callLogs.find((l) => l.call_sid === callSid);
}
