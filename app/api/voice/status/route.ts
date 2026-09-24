/**
 * POST /api/voice/status
 * Twilio call status callback — called when a call ends.
 * Writes a call log entry and cleans up the session.
 */

import { NextResponse } from "next/server";
import { getSession, deleteSession } from "@/lib/voice/session";
import { addCallLog } from "@/lib/store/call-logs";
import type Anthropic from "@anthropic-ai/sdk";

function extractTranscript(
  messages: Anthropic.MessageParam[]
): { role: "user" | "assistant"; content: string }[] {
  return messages.flatMap((m) => {
    if (typeof m.content === "string") {
      return [{ role: m.role as "user" | "assistant", content: m.content }];
    }
    // Extract only text blocks (skip tool_use / tool_result).
    const texts = (m.content as Anthropic.ContentBlock[])
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    if (!texts) return [];
    return [{ role: m.role as "user" | "assistant", content: texts }];
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);

  const callSid = params.get("CallSid") ?? "";
  const callStatus = params.get("CallStatus") ?? "completed";
  const callDuration = parseInt(params.get("CallDuration") ?? "0", 10);
  const recordingUrl = params.get("RecordingUrl") ?? null;
  const startedAt = params.get("Timestamp") ?? new Date().toISOString();

  const session = getSession(callSid);

  if (callSid) {
    void addCallLog({
      call_sid: callSid,
      caller_number: session?.callerNumber ?? null,
      mode: session?.mode ?? "unknown",
      status: callStatus as CallLogEntry["status"],
      duration_seconds: callDuration,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      transcript: session ? extractTranscript(session.messages) : [],
      transfer_attempted: session?.transferFailed !== undefined ? true : false,
      transfer_answered: session ? !session.transferFailed : false,
      recording_url: recordingUrl,
    });
    deleteSession(callSid);
  }

  return new NextResponse(null, { status: 204 });
}

// Re-export the type so the import in addCallLog works.
type CallLogEntry = import("@/lib/store/call-logs").CallLogEntry;
