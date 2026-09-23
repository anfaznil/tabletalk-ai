/**
 * Per-call session state for the ConversationRelay WebSocket.
 * Keyed by Twilio CallSid. Cleaned up when the call ends.
 */

import type Anthropic from "@anthropic-ai/sdk";

export interface VoiceSession {
  callSid: string;
  /** Transcript so far — same shape as the /api/chat history. */
  messages: Anthropic.MessageParam[];
  /** True if a transfer was attempted and the callee didn't answer. */
  transferFailed: boolean;
  /** Caller's phone number from Twilio (may be undefined for blocked IDs). */
  callerNumber?: string;
  /** Routing mode the call came through. */
  mode: "backup" | "full" | "unknown";
  createdAt: number;
}

const store = new Map<string, VoiceSession>();

export function createSession(callSid: string, callerNumber?: string, mode: VoiceSession["mode"] = "unknown"): VoiceSession {
  const session: VoiceSession = {
    callSid,
    messages: [],
    transferFailed: false,
    callerNumber,
    mode,
    createdAt: Date.now(),
  };
  store.set(callSid, session);
  return session;
}

export function getSession(callSid: string): VoiceSession | undefined {
  return store.get(callSid);
}

export function deleteSession(callSid: string): void {
  store.delete(callSid);
}

/** Prune sessions older than 2 hours to prevent memory leaks. */
export function pruneOldSessions(): void {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [sid, session] of store.entries()) {
    if (session.createdAt < cutoff) store.delete(sid);
  }
}
