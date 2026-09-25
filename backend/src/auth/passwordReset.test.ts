import { describe, expect, it, vi, afterEach } from "vitest";
import { generateResetToken } from "./passwordReset";
import { generateVerificationToken } from "./verification";

afterEach(() => vi.useRealTimers());

describe("generateResetToken", () => {
  it("returns 32 bytes as 64 hex characters", () => {
    const { token } = generateResetToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("never repeats a token", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateResetToken().token));
    expect(tokens.size).toBe(200);
  });

  it("expires an hour out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const { expiresAt } = generateResetToken();

    expect(expiresAt.toISOString()).toBe("2026-01-01T01:00:00.000Z");
  });

  // Not a detail - it's the reason this module exists separately. A
  // verification token only confirms an address; a reset token hands over the
  // account, so its useful life is deliberately much shorter. Someone
  // "tidying up" by sharing one TTL between them would be a security
  // regression, and this is what says so.
  it("lives far shorter than a verification token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const reset = generateResetToken().expiresAt.getTime();
    const verification = generateVerificationToken().expiresAt.getTime();

    expect(reset).toBeLessThan(verification);
    expect(verification - reset).toBe(23 * 60 * 60 * 1000);
  });

  it("produces a token the reset-password schema accepts", async () => {
    const { resetPasswordSchema } = await import("../routes/auth.schemas.js");
    const { token } = generateResetToken();
    expect(resetPasswordSchema.safeParse({ token, password: "a-long-enough-password" }).success).toBe(true);
  });
});
