import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

export const SESSION_COOKIE_NAME = "stockpulse_session";

export interface SessionPayload {
  userId: string;
  epoch: number;
}

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("hex");
}

// Cookie value is "<userId>.<epoch>.<hmac>" — not encrypted, just
// tamper-evident. There's nothing sensitive in the payload (an opaque user id
// and a counter), so signing to prevent forgery is enough.
//
// The epoch is what makes revocation possible at all. Signing the user id
// alone produced a cookie that stayed valid forever: logout only cleared the
// browser's copy, and a value captured beforehand kept working indefinitely.
// Carrying the epoch lets the server compare it against the user's current one
// and reject anything issued before the last revocation.
export function createSessionCookieValue(userId: string, epoch: number): string {
  const payload = `${userId}.${epoch}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Checks only that the value is intact and ours. Whether the epoch is still
 * current is a separate question that needs the database — see
 * resolveSession in ./middleware.
 */
export function verifySessionCookieValue(value: string | undefined): SessionPayload | null {
  if (!value) return null;

  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const payload = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);

  const signatureBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(sign(payload), "hex");
  if (signatureBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(signatureBuf, expectedBuf)) return null;

  // Split *after* verifying, so a tampered payload never reaches the parser.
  const epochIndex = payload.lastIndexOf(".");
  if (epochIndex === -1) return null;

  const userId = payload.slice(0, epochIndex);
  const epoch = Number(payload.slice(epochIndex + 1));
  if (!userId || !Number.isInteger(epoch) || epoch < 0) return null;

  return { userId, epoch };
}
