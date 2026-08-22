import { describe, expect, it } from "vitest";
import { credentialsSchema, verifyEmailBodySchema } from "./auth.schemas";

describe("credentialsSchema email handling", () => {
  // Regression from the zod 4 upgrade: swapping to z.email() moved validation
  // ahead of the trim, so a pasted address with surrounding whitespace — the
  // single most common way an email arrives from a real form — started being
  // rejected instead of cleaned up. Nothing in the suite covered it.
  it("trims and lowercases before validating, not after", () => {
    const parsed = credentialsSchema.safeParse({
      email: "  Emri@Example.COM  ",
      password: "hunter22",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.email).toBe("emri@example.com");
  });

  it("still rejects something that isn't an address", () => {
    const parsed = credentialsSchema.safeParse({ email: "not-an-email", password: "hunter22" });

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.message).toBe("Not a valid email address");
  });

  it("rejects an absurdly long address", () => {
    const parsed = credentialsSchema.safeParse({
      email: `${"a".repeat(250)}@example.com`,
      password: "hunter22",
    });

    expect(parsed.success).toBe(false);
  });

  it("enforces the password length floor", () => {
    const parsed = credentialsSchema.safeParse({ email: "a@b.co", password: "short" });

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.message).toBe("Password must be at least 8 characters");
  });
});

describe("verifyEmailBodySchema", () => {
  it("accepts a hex token and rejects anything else", () => {
    expect(verifyEmailBodySchema.safeParse({ token: "a".repeat(64) }).success).toBe(true);
    expect(verifyEmailBodySchema.safeParse({ token: "not-hex!" }).success).toBe(false);
    expect(verifyEmailBodySchema.safeParse({ token: "" }).success).toBe(false);
  });
});
