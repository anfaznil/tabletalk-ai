import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";
import type { ForwardingMode } from "@/lib/store/voice";

export interface CallLogEntry {
  id: string;
  call_sid: string;
  caller_number: string | null;
  mode: ForwardingMode | "unknown";
  status: "completed" | "no-answer" | "busy" | "failed" | "in-progress";
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  transcript: { role: "user" | "assistant"; content: string }[];
  transfer_attempted: boolean;
  transfer_answered: boolean;
  recording_url: string | null;
}

function toEntry(row: {
  id: string;
  call_sid: string;
  caller_number: string | null;
  mode: string;
  status: string;
  duration_seconds: number;
  started_at: Date;
  ended_at: Date | null;
  transcript: unknown;
  transfer_attempted: boolean;
  transfer_answered: boolean;
  recording_url: string | null;
}): CallLogEntry {
  return {
    id: row.id,
    call_sid: row.call_sid,
    caller_number: row.caller_number,
    mode: row.mode as CallLogEntry["mode"],
    status: row.status as CallLogEntry["status"],
    duration_seconds: row.duration_seconds,
    started_at: row.started_at.toISOString(),
    ended_at: row.ended_at?.toISOString() ?? null,
    transcript: (row.transcript as CallLogEntry["transcript"]) ?? [],
    transfer_attempted: row.transfer_attempted,
    transfer_answered: row.transfer_answered,
    recording_url: row.recording_url,
  };
}

export async function addCallLog(entry: Omit<CallLogEntry, "id">): Promise<CallLogEntry> {
  const rid = await getRestaurantId();

  // Upsert so that duplicate callSid from Twilio retries doesn't throw.
  const row = await prisma.callLog.upsert({
    where: { call_sid: entry.call_sid },
    create: {
      restaurant_id: rid,
      call_sid: entry.call_sid,
      caller_number: entry.caller_number,
      mode: entry.mode,
      status: entry.status,
      duration_seconds: entry.duration_seconds,
      started_at: new Date(entry.started_at),
      ended_at: entry.ended_at ? new Date(entry.ended_at) : null,
      transcript: entry.transcript,
      transfer_attempted: entry.transfer_attempted,
      transfer_answered: entry.transfer_answered,
      recording_url: entry.recording_url,
    },
    update: {
      status: entry.status,
      duration_seconds: entry.duration_seconds,
      ended_at: entry.ended_at ? new Date(entry.ended_at) : null,
      transcript: entry.transcript,
      transfer_attempted: entry.transfer_attempted,
      transfer_answered: entry.transfer_answered,
      recording_url: entry.recording_url,
    },
  });
  return toEntry(row);
}

export async function getCallLogs(limit = 50): Promise<CallLogEntry[]> {
  const rid = await getRestaurantId();
  const rows = await prisma.callLog.findMany({
    where: { restaurant_id: rid },
    orderBy: { started_at: "desc" },
    take: Math.min(limit, 200),
  });
  return rows.map(toEntry);
}

export async function getCallLogByCallSid(callSid: string): Promise<CallLogEntry | undefined> {
  const rid = await getRestaurantId();
  const row = await prisma.callLog.findFirst({ where: { call_sid: callSid, restaurant_id: rid } });
  return row ? toEntry(row) : undefined;
}
