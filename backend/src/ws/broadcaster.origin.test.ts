import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./broadcaster";

const ALLOWED = "http://localhost:5173";

// Guards against cross-site WebSocket hijacking: CORS doesn't run on a WS
// upgrade, so the origin has to be checked explicitly or any site could open
// an authenticated socket using the visitor's cookie.
describe("isAllowedOrigin", () => {
  it("accepts the configured frontend origin", () => {
    expect(isAllowedOrigin(ALLOWED, ALLOWED)).toBe(true);
  });

  it("rejects a foreign origin", () => {
    expect(isAllowedOrigin("https://evil.example.com", ALLOWED)).toBe(false);
  });

  it("rejects a lookalike origin that only shares a prefix", () => {
    expect(isAllowedOrigin("http://localhost:5173.evil.com", ALLOWED)).toBe(false);
  });

  it("rejects the same host on a different scheme", () => {
    expect(isAllowedOrigin("https://localhost:5173", ALLOWED)).toBe(false);
  });

  it("allows a request with no Origin header at all", () => {
    // Non-browser clients (tests, curl, a native app) send no Origin. There's
    // no ambient cookie in that case, so there's nothing to hijack.
    expect(isAllowedOrigin(undefined, ALLOWED)).toBe(true);
  });
});
