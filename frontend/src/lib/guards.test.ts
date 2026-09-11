import { describe, expect, it } from "vitest";
import {
  isFiniteNumber,
  isNonEmptyString,
  isNullableFiniteNumber,
  isNullableString,
  isRecord,
} from "./guards";

// These are the primitives both the WebSocket parser and the REST validators
// are built from, so a hole here is a hole in every field either one checks.
// The module exists to keep one definition of "usable number" rather than two
// that drift; that's only true if the definition is pinned.

describe("isFiniteNumber", () => {
  it("accepts ordinary numbers, including zero and negatives", () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-12.5)).toBe(true);
  });

  // The stated reason the guard exists: NaN renders as "$NaN" and Infinity
  // breaks every chart axis it reaches.
  it("rejects NaN and both infinities", () => {
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber(-Infinity)).toBe(false);
  });

  // JSON.stringify turns NaN and Infinity into null, so null on a numeric
  // field is the exact shape a bad server value arrives in.
  it("rejects null, undefined and numeric strings", () => {
    expect(isFiniteNumber(null)).toBe(false);
    expect(isFiniteNumber(undefined)).toBe(false);
    expect(isFiniteNumber("12")).toBe(false);
  });
});

describe("isNullableFiniteNumber", () => {
  it("allows null but still refuses NaN", () => {
    expect(isNullableFiniteNumber(null)).toBe(true);
    expect(isNullableFiniteNumber(3)).toBe(true);
    expect(isNullableFiniteNumber(NaN)).toBe(false);
  });

  // "absent is wrong, null isn't" — undefined means the field never arrived.
  it("refuses undefined", () => {
    expect(isNullableFiniteNumber(undefined)).toBe(false);
  });
});

describe("isNonEmptyString", () => {
  it("rejects the empty string", () => {
    expect(isNonEmptyString("AAPL")).toBe(true);
    expect(isNonEmptyString("")).toBe(false);
  });
});

describe("isNullableString", () => {
  it("allows null and the empty string, but not undefined", () => {
    expect(isNullableString(null)).toBe(true);
    expect(isNullableString("")).toBe(true);
    expect(isNullableString(undefined)).toBe(false);
  });
});

describe("isRecord", () => {
  it("accepts a plain object", () => {
    expect(isRecord({ type: "tick" })).toBe(true);
  });

  // typeof null === "object" and typeof [] === "object": both would otherwise
  // reach property access on a frame that has no properties.
  it("rejects null and arrays", () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord([{ type: "tick" }])).toBe(false);
  });

  it("rejects primitives", () => {
    expect(isRecord("tick")).toBe(false);
    expect(isRecord(7)).toBe(false);
  });
});
