import { describe, expect, it } from "vitest";
import { symbolSchema, addItemSchema } from "./watchlist.schemas";

describe("symbolSchema", () => {
  it("accepts a plain ticker", () => {
    expect(symbolSchema.parse("AAPL")).toBe("AAPL");
  });

  it("uppercases and trims", () => {
    expect(symbolSchema.parse("  aapl  ")).toBe("AAPL");
  });

  it("accepts dotted share-class tickers like BRK.B", () => {
    expect(symbolSchema.parse("brk.b")).toBe("BRK.B");
  });

  it("accepts hyphenated share-class tickers like BF-B", () => {
    expect(symbolSchema.parse("bf-b")).toBe("BF-B");
  });

  it("rejects an empty string", () => {
    expect(symbolSchema.safeParse("").success).toBe(false);
  });

  it("rejects symbols longer than 6 letters", () => {
    expect(symbolSchema.safeParse("TOOLONGTICKER").success).toBe(false);
  });

  it("rejects symbols containing digits", () => {
    expect(symbolSchema.safeParse("AAP1").success).toBe(false);
  });

  it("rejects SQL/JS-injection-shaped input rather than passing it through", () => {
    expect(symbolSchema.safeParse("'; DROP TABLE watchlist;--").success).toBe(false);
    expect(symbolSchema.safeParse("<script>alert(1)</script>").success).toBe(false);
  });
});

describe("addItemSchema", () => {
  it("accepts a symbol with a name", () => {
    const result = addItemSchema.parse({ symbol: "aapl", name: "Apple Inc." });
    expect(result).toEqual({ symbol: "AAPL", name: "Apple Inc." });
  });

  it("accepts a symbol with no name (optional)", () => {
    const result = addItemSchema.parse({ symbol: "aapl" });
    expect(result.name).toBeUndefined();
  });

  it("rejects a missing symbol", () => {
    expect(addItemSchema.safeParse({ name: "Apple Inc." }).success).toBe(false);
  });

  it("rejects a name over 200 characters", () => {
    const result = addItemSchema.safeParse({ symbol: "AAPL", name: "x".repeat(201) });
    expect(result.success).toBe(false);
  });
});
