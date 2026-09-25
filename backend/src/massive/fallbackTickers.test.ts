import { describe, expect, it } from "vitest";
import { FALLBACK_TICKERS } from "./fallbackTickers";
import { symbolSchema } from "../routes/watchlist.schemas";

// This list is what search serves with no API key or a spent quota, so it is
// the only thing standing between a keyless clone and an empty search box.
describe("FALLBACK_TICKERS", () => {
  it("isn't empty", () => {
    expect(FALLBACK_TICKERS.length).toBeGreaterThan(0);
  });

  it("gives every entry both a symbol and a name", () => {
    for (const ticker of FALLBACK_TICKERS) {
      expect(ticker.symbol.trim()).not.toBe("");
      expect(ticker.name.trim()).not.toBe("");
    }
  });

  // A fallback result the user can't then add would be a strange kind of
  // help: search offers it, POST /api/watchlist rejects it.
  it("only offers symbols the watchlist schema would accept", () => {
    for (const ticker of FALLBACK_TICKERS) {
      expect(symbolSchema.safeParse(ticker.symbol).success, `${ticker.symbol} is not addable`).toBe(true);
    }
  });

  it("has no duplicate symbols", () => {
    const symbols = FALLBACK_TICKERS.map((t) => t.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it("is already uppercase, so search matching doesn't depend on the caller", () => {
    for (const ticker of FALLBACK_TICKERS) {
      expect(ticker.symbol).toBe(ticker.symbol.toUpperCase());
    }
  });
});
