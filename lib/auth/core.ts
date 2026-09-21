// Edge-safe server-only auth helpers. No `next/headers` import — safe to use
// from middleware (edge runtime) and route handlers. Never import from a
// client component.

export const AUTH_COOKIE_NAME = "digidesk_admin_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 1 day

function getAuthSecret(): string {
  const explicit = process.env.AUTH_SECRET;

  if (explicit && explicit.trim().length >= 16) {
    return explicit.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be configured with at least 16 characters in production.');
  }

  // Derive a stable secret from the admin credentials so the system remains
  // functional even when AUTH_SECRET is not set. Prefer setting AUTH_SECRET.
  const fallback = `${process.env.ADMIN_PASSWORD ?? ""}:${process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? ""}`;

  if (fallback.trim()) {
    return fallback.trim();
  }

  return "digidesk-admin-session-secret";
}

async function toBase64Url(data: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(data);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToUint8(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function sign(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return `${value}.${await toBase64Url(signature)}`;
}

function encodeBase64UrlString(value: string): string {
  const encoded = btoa(value);
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createSessionToken(): Promise<string> {
  const payload = encodeBase64UrlString(
    JSON.stringify({
      role: "admin",
      iat: Math.floor(Date.now() / 1000),
    })
  );

  return sign(payload);
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const expected = await sign(parts[0]);
  const actual = token;

  // Constant-time comparison to avoid leaking timing information.
  if (expected.length !== actual.length) {
    return false;
  }

  let diff = 0;

  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }

  if (diff !== 0) {
    return false;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToUint8(parts[0]))
    ) as { role?: string; iat?: number };

    if (payload.role !== "admin") {
      return false;
    }

    const issuedAt = typeof payload.iat === "number" ? payload.iat : 0;

    return Math.floor(Date.now() / 1000) - issuedAt < SESSION_TTL_SECONDS;
  } catch {
    return false;
  }
}
