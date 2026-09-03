import { randomBytes } from "node:crypto";

// Much shorter than the 24h verification window on purpose. A verification
// token only confirms an address; a reset token hands over the account, so
// the window in which a leaked one is useful should be small.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export function generateResetToken(): { token: string; expiresAt: Date } {
  return {
    token: randomBytes(32).toString("hex"),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}
