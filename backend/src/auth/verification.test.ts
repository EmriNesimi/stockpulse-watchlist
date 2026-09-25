import { describe, expect, it, vi, afterEach } from "vitest";
import { generateVerificationToken } from "./verification";

afterEach(() => vi.useRealTimers());

describe("generateVerificationToken", () => {
  it("returns 32 bytes as 64 hex characters", () => {
    const { token } = generateVerificationToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("never repeats a token", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateVerificationToken().token));
    expect(tokens.size).toBe(200);
  });

  it("expires 24 hours out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const { expiresAt } = generateVerificationToken();

    expect(expiresAt.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  // The token shape has to satisfy the route's own schema, or a token this
  // function mints could be rejected on the way back in.
  it("produces a token the verify-email schema accepts", async () => {
    const { verifyEmailBodySchema } = await import("../routes/auth.schemas");
    const { token } = generateVerificationToken();
    expect(verifyEmailBodySchema.safeParse({ token }).success).toBe(true);
  });
});
