import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth/constants";

export { SESSION_COOKIE };

export interface SessionData {
  username: string;
}

function getSecret(): string {
  return process.env.AUTH_SECRET ?? "tabletalk-dev-secret-change-me";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signPayload(payloadB64: string): Promise<string> {
  const key = await importHmacKey(getSecret());
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  return toBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function createSessionToken(username: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const payload = JSON.stringify({ username, exp });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const signature = await signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export async function verifySessionToken(
  token: string
): Promise<SessionData | null> {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = await signPayload(payloadB64);
  if (!timingSafeEqual(expected, signature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(payloadB64)) as {
      username: string;
      exp: number;
    };
    if (!payload.username || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { username: payload.username };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  };
}
