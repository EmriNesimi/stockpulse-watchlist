import { describe, expect, it } from "vitest";
import { symbolSchema, addItemSchema, updateHoldingsSchema } from "./watchlist.schemas";

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

  it("rejects an empty-string name instead of silently accepting it", () => {
    expect(addItemSchema.safeParse({ symbol: "AAPL", name: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    expect(addItemSchema.safeParse({ symbol: "AAPL", name: "   " }).success).toBe(false);
  });

  it("accepts shares and costBasis provided together", () => {
    const result = addItemSchema.safeParse({ symbol: "AAPL", shares: 10, costBasis: 150.5 });
    expect(result.success).toBe(true);
  });

  it("accepts neither shares nor costBasis (just watching, not owning)", () => {
    expect(addItemSchema.safeParse({ symbol: "AAPL" }).success).toBe(true);
  });

  it("rejects shares without costBasis", () => {
    expect(addItemSchema.safeParse({ symbol: "AAPL", shares: 10 }).success).toBe(false);
  });

  it("rejects costBasis without shares", () => {
    expect(addItemSchema.safeParse({ symbol: "AAPL", costBasis: 150.5 }).success).toBe(false);
  });

  it("rejects zero or negative shares", () => {
    expect(addItemSchema.safeParse({ symbol: "AAPL", shares: 0, costBasis: 150 }).success).toBe(false);
    expect(addItemSchema.safeParse({ symbol: "AAPL", shares: -5, costBasis: 150 }).success).toBe(false);
  });

  it("rejects an absurdly large costBasis", () => {
    expect(addItemSchema.safeParse({ symbol: "AAPL", shares: 1, costBasis: 1e300 }).success).toBe(false);
  });
});

describe("updateHoldingsSchema", () => {
  it("accepts real shares/costBasis together", () => {
    expect(updateHoldingsSchema.safeParse({ shares: 5, costBasis: 200 }).success).toBe(true);
  });

  it("accepts both explicitly null (clearing holdings)", () => {
    expect(updateHoldingsSchema.safeParse({ shares: null, costBasis: null }).success).toBe(true);
  });

  it("rejects a mix of a real value and null", () => {
    expect(updateHoldingsSchema.safeParse({ shares: 5, costBasis: null }).success).toBe(false);
    expect(updateHoldingsSchema.safeParse({ shares: null, costBasis: 200 }).success).toBe(false);
  });

  it("rejects a missing field entirely - both keys are required (even if null)", () => {
    expect(updateHoldingsSchema.safeParse({ shares: 5 }).success).toBe(false);
  });
});
