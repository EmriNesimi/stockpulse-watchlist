import { describe, expect, it } from "vitest";
import { clientErrorSchema } from "./clientErrors.schemas";

// The only *.schemas.ts in the backend that had no test, and the one whose
// endpoint is unauthenticated. The caps are what stop a public POST from
// filling the log stream, so they're worth pinning rather than trusting.
describe("clientErrorSchema", () => {
  it("accepts a minimal report with just a message", () => {
    expect(clientErrorSchema.safeParse({ message: "boom" }).success).toBe(true);
  });

  it("accepts a full report", () => {
    const parsed = clientErrorSchema.safeParse({
      message: "Cannot read properties of null",
      stack: "Error: ...\n  at x",
      componentStack: "  in WatchlistRow\n  in WatchlistTable",
      url: "https://example.com/dashboard",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires a message", () => {
    expect(clientErrorSchema.safeParse({ stack: "Error: ..." }).success).toBe(false);
  });

  it("rejects a message that's empty or only whitespace", () => {
    expect(clientErrorSchema.safeParse({ message: "" }).success).toBe(false);
    expect(clientErrorSchema.safeParse({ message: "   " }).success).toBe(false);
  });

  it("trims the message rather than storing the padding", () => {
    const parsed = clientErrorSchema.safeParse({ message: "  boom  " });
    expect(parsed.success && parsed.data.message).toBe("boom");
  });

  it("caps the message at 500 characters", () => {
    expect(clientErrorSchema.safeParse({ message: "x".repeat(500) }).success).toBe(true);
    expect(clientErrorSchema.safeParse({ message: "x".repeat(501) }).success).toBe(false);
  });

  it("caps stack and componentStack at 4000 characters each", () => {
    for (const field of ["stack", "componentStack"] as const) {
      expect(clientErrorSchema.safeParse({ message: "boom", [field]: "x".repeat(4000) }).success).toBe(true);
      expect(clientErrorSchema.safeParse({ message: "boom", [field]: "x".repeat(4001) }).success).toBe(false);
    }
  });

  it("caps url at 500 characters", () => {
    expect(clientErrorSchema.safeParse({ message: "boom", url: "x".repeat(500) }).success).toBe(true);
    expect(clientErrorSchema.safeParse({ message: "boom", url: "x".repeat(501) }).success).toBe(false);
  });

  it("takes the url as a plain string, not a validated URL", () => {
    // Deliberate: it's a report about something that already went wrong, and
    // rejecting the report because its url field is odd would lose the error.
    expect(clientErrorSchema.safeParse({ message: "boom", url: "not-a-url" }).success).toBe(true);
  });
});
