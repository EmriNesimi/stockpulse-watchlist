import { describe, expect, it } from "vitest";
import { createSessionCookieValue, verifySessionCookieValue } from "./session";

describe("createSessionCookieValue / verifySessionCookieValue", () => {
  it("round-trips a userId through a valid cookie value", () => {
    const value = createSessionCookieValue("user-123");
    expect(verifySessionCookieValue(value)).toBe("user-123");
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
    const value = createSessionCookieValue("user-123");
    const [, signature] = [value.slice(0, value.lastIndexOf(".")), value.slice(value.lastIndexOf(".") + 1)];
    const tampered = `user-456.${signature}`;
    expect(verifySessionCookieValue(tampered)).toBeNull();
  });

  it("returns null if the signature was tampered with", () => {
    const value = createSessionCookieValue("user-123");
    const tampered = value.slice(0, -1) + (value.endsWith("0") ? "1" : "0");
    expect(verifySessionCookieValue(tampered)).toBeNull();
  });

  it("returns null for a garbage signature of the wrong length", () => {
    expect(verifySessionCookieValue("user-123.notvalidhex")).toBeNull();
  });
});
