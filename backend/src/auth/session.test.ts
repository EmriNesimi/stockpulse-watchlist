import { describe, expect, it } from "vitest";
import { createSessionCookieValue, verifySessionCookieValue } from "./session";

describe("createSessionCookieValue / verifySessionCookieValue", () => {
  it("round-trips a userId through a valid cookie value", () => {
    const value = createSessionCookieValue("user-123", 0);
    expect(verifySessionCookieValue(value)).toEqual({ userId: "user-123", epoch: 0 });
  });

  it("returns null for an undefined cookie value", () => {
    expect(verifySessionCookieValue(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(verifySessionCookieValue("")).toBeNull();
  });

  it("returns null for a value with no signature separator", () => {
    expect(verifySessionCookieValue("just-a-userid-no-signature")).toBeNull();
  });

  it("returns null if the userId was tampered with after signing", () => {
    const value = createSessionCookieValue("user-123", 0);
    const [, signature] = [value.slice(0, value.lastIndexOf(".")), value.slice(value.lastIndexOf(".") + 1)];
    const tampered = `user-456.0.${signature}`;
    expect(verifySessionCookieValue(tampered)).toBeNull();
  });

  it("returns null if the signature was tampered with", () => {
    const value = createSessionCookieValue("user-123", 0);
    const tampered = value.slice(0, -1) + (value.endsWith("0") ? "1" : "0");
    expect(verifySessionCookieValue(tampered)).toBeNull();
  });

  it("returns null for a garbage signature of the wrong length", () => {
    expect(verifySessionCookieValue("user-123.notvalidhex")).toBeNull();
  });
});

describe("session epoch", () => {
  it("carries the epoch it was issued at", () => {
    expect(verifySessionCookieValue(createSessionCookieValue("user-123", 7))).toEqual({
      userId: "user-123",
      epoch: 7,
    });
  });

  // The whole point of signing the epoch alongside the id: someone holding a
  // stale cookie must not be able to raise its epoch to dodge a revocation.
  it("rejects a cookie whose epoch was edited", () => {
    const value = createSessionCookieValue("user-123", 1);
    const signature = value.slice(value.lastIndexOf(".") + 1);

    expect(verifySessionCookieValue(`user-123.99.${signature}`)).toBeNull();
  });

  it("rejects a non-numeric epoch", () => {
    expect(verifySessionCookieValue(createSessionCookieValue("user-123", Number.NaN))).toBeNull();
  });
});
