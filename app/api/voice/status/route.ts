/**
 * POST /api/voice/status
 * Twilio call status callback — called when a call ends.
 * Used for call logging and session cleanup.
 */

import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/voice/session";

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);

  const callSid = params.get("CallSid") ?? "";
  const callStatus = params.get("CallStatus") ?? "";
  const callDuration = params.get("CallDuration") ?? "0";

  console.log(`[voice] Call ${callSid} ended: status=${callStatus} duration=${callDuration}s`);

  // TODO (Phase 2): persist call log entry to database here.

  if (callSid) deleteSession(callSid);

  return new NextResponse(null, { status: 204 });
}
