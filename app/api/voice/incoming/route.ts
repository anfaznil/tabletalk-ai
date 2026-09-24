/**
 * POST /api/voice/incoming
 * Twilio webhook — called when a call arrives on the Twilio number.
 * Returns TwiML that starts a ConversationRelay session.
 */

import { NextResponse } from "next/server";
import { buildConversationRelayTwiml } from "@/lib/voice/twiml";
import { createSession } from "@/lib/voice/session";
import { getVoiceSettings, updateVoiceSettings, type ForwardingMode } from "@/lib/store/voice";

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-proto");
  const proto = forwarded ?? url.protocol.replace(":", "");
  return `${proto}://${url.host}`;
}

function detectMode(params: URLSearchParams): ForwardingMode {
  // Twilio populates ForwardedFrom when the call arrived via carrier forwarding.
  const forwardedFrom = params.get("ForwardedFrom");
  if (forwardedFrom) return "backup";
  const to = params.get("To") ?? "";
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER ?? "";
  if (twilioNumber && to === twilioNumber) return "full";
  return "backup"; // safe default
}

function buildGreeting(mode: ForwardingMode, storeName: string): string {
  if (mode === "backup") {
    // Backup: staff missed the call — acknowledge it and offer to help.
    return `Hey, sorry we missed you — I can help take your order or answer any questions.`;
  }
  // Full mode: normal greeting, no apology.
  return `Hi, this is ${storeName}.`;
}

export async function POST(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);

  const callSid = params.get("CallSid") ?? "unknown";
  const callerNumber = params.get("From") ?? undefined;
  const detectedMode = detectMode(params);
  const voiceSettings = await getVoiceSettings();
  const mode = voiceSettings.mode ?? detectedMode;

  // Mark this mode as verified the first time a call arrives — confirms forwarding works.
  if (!voiceSettings.mode_verified) {
    void updateVoiceSettings({ mode_verified: true });
  }

  const session = createSession(callSid, callerNumber, mode);
  void session; // unused but createSession has side effects

  const base = getBaseUrl(request);
  const wsUrl = `${base.replace(/^http/, "ws")}/api/voice/relay`;
  const storeName = process.env.STORE_NAME ?? "the restaurant";
  const greeting = buildGreeting(mode, storeName);

  const twiml = buildConversationRelayTwiml(wsUrl, callSid, greeting);

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
