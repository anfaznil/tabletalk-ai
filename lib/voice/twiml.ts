/**
 * Minimal TwiML builder — avoids pulling twilio's full VoiceResponse into edge-safe code.
 * Enough to generate the XML Twilio needs for ConversationRelay and <Dial>.
 */

export function buildConversationRelayTwiml(
  wsUrl: string,
  callSid: string,
  greeting = "Hi, this is the restaurant."
): string {
  const escapedGreeting = greeting.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
  // Recording disclosure injected as a <Say> before <Connect> so it plays once.
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">This call may be recorded for quality and training purposes.</Say>
  <Connect>
    <ConversationRelay url="${wsUrl}" callSid="${callSid}" welcomeGreeting="${escapedGreeting}" ttsProvider="google" voice="en-US-Neural2-F" dtmfDetection="true" interruptByDtmf="true" />
  </Connect>
</Response>`;
}

export function buildTransferTwiml(transferTo: string, statusCallbackUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial action="${statusCallbackUrl}" timeout="20" callerId="${process.env.TWILIO_PHONE_NUMBER ?? ""}">
    <Number>${transferTo}</Number>
  </Dial>
</Response>`;
}

export function buildVoicemailTwiml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, no one is available right now. Please leave a message after the tone and we&apos;ll call you back.</Say>
  <Record maxLength="120" playBeep="true" />
  <Say voice="Polly.Joanna">Thank you, we&apos;ll be in touch.</Say>
</Response>`;
}

/** Returns TwiML after a failed transfer — AI rejoins the call. */
export function buildTransferFailedTwiml(wsUrl: string, callSid: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay url="${wsUrl}?transfer_failed=1" callSid="${callSid}" ttsProvider="google" voice="en-US-Neural2-F" dtmfDetection="true" />
  </Connect>
</Response>`;
}
