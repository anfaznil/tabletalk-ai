/**
 * POST /api/voice/transfer-status
 * Twilio <Dial> action callback — called when a transfer attempt completes.
 * If the transfer wasn't answered, returns TwiML that reconnects the caller
 * to the AI (via ConversationRelay with transfer_failed=1).
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/voice/session";
import { buildTransferFailedTwiml } from "@/lib/voice/twiml";

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-proto");
  const proto = forwarded ?? url.protocol.replace(":", "");
  return `${proto}://${url.host}`;
}

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const url = new URL(request.url);

  const callSid = url.searchParams.get("callSid") ?? params.get("CallSid") ?? "";
  const dialStatus = params.get("DialCallStatus") ?? "";

  console.log(`[voice] Transfer for ${callSid}: DialCallStatus=${dialStatus}`);

  const answered = dialStatus === "completed" || dialStatus === "answered";

  if (!answered && callSid) {
    const session = getSession(callSid);
    if (session) session.transferFailed = true;

    const base = getBaseUrl(request);
    const wsUrl = `${base.replace(/^http/, "ws")}/api/voice/relay`;
    const twiml = buildTransferFailedTwiml(wsUrl, callSid);

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Transfer was answered — call is done on our end.
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
