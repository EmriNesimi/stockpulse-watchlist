import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

export const SESSION_COOKIE_NAME = "stockpulse_session";

function sign(userId: string): string {
  return createHmac("sha256", env.sessionSecret).update(userId).digest("hex");
}

// Cookie value is "<userId>.<hmac>" - not encrypted, just tamper-evident.
// There's nothing sensitive in the payload (just an opaque user id), so
// signing to prevent forgery is enough; no need to encrypt it too.
export function createSessionCookieValue(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function verifySessionCookieValue(value: string | undefined): string | null {
  if (!value) return null;
  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const userId = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const expected = sign(userId);

  const signatureBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (signatureBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(signatureBuf, expectedBuf)) return null;

  return userId;
}
