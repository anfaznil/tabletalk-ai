/**
 * POST /api/voice/incoming
 * Twilio webhook — called when a call arrives on the Twilio number.
 * Returns TwiML that starts a ConversationRelay session.
 */

import { NextResponse } from "next/server";
import { buildConversationRelayTwiml } from "@/lib/voice/twiml";
import { createSession } from "@/lib/voice/session";

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-proto");
  const proto = forwarded ?? url.protocol.replace(":", "");
  return `${proto}://${url.host}`;
}

function detectMode(params: URLSearchParams): "backup" | "full" | "unknown" {
  // Twilio sets X-Forwarded-For or ForwardedFrom when the call was forwarded.
  const forwardedFrom = params.get("ForwardedFrom");
  if (forwardedFrom) return "backup";
  // If the restaurant number is set and the To param matches, assume Full mode.
  const to = params.get("To") ?? "";
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER ?? "";
  if (twilioNumber && to === twilioNumber) return "full";
  return "unknown";
}

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);

  const callSid = params.get("CallSid") ?? "unknown";
  const callerNumber = params.get("From") ?? undefined;
  const mode = detectMode(params);

  createSession(callSid, callerNumber, mode);

  const base = getBaseUrl(request);
  // wss:// for production (https), ws:// for local dev (http)
  const wsUrl = `${base.replace(/^http/, "ws")}/api/voice/relay`;

  const twiml = buildConversationRelayTwiml(wsUrl, callSid);

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
