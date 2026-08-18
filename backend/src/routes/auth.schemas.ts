import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Not a valid email address").max(254),
  // Just a length floor, not a complexity rule — those tend to push users
  // toward "Password1!" over a genuinely long passphrase.
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// Verification tokens are 32 random bytes, hex-encoded (see auth/verification.ts).
// Sent in the body rather than the query string: consuming the token mutates
// state, so it goes over POST, and a body keeps the token out of access logs
// and Referer headers.
export const verifyEmailBodySchema = z.object({
  token: z.string().trim().min(1).max(64).regex(/^[a-f0-9]+$/, "Invalid verification token"),
});
