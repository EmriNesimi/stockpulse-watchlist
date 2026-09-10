import { describe, expect, it } from "vitest";
import {
  ResponseShapeError,
  parseAlertsResponse,
  parseHistoryResponse,
  parseWatchlistResponse,
} from "./apiShapes";

const item = {
  id: "cl1",
  symbol: "AAPL",
  name: "Apple Inc.",
  addedAt: "2026-09-01T00:00:00.000Z",
  shares: 12,
  costBasis: 300,
};

// The backend sends time as "YYYY-MM-DD" — see Candle in
// backend/src/priceFeed/simulatedHistory.ts and the mapping in
// massive/fetchHistory.ts. A numeric fixture here is what let the frontend
// type drift to `number` without a single test noticing.
const candle = { time: "2026-09-04", open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 };

describe("parseWatchlistResponse", () => {
  it("accepts a well-formed watchlist", () => {
    expect(parseWatchlistResponse({ items: [item] }).items).toEqual([item]);
  });

  it("accepts an item with no holdings", () => {
    const watching = { ...item, shares: null, costBasis: null };
    expect(parseWatchlistResponse({ items: [watching] }).items).toEqual([watching]);
  });

  // The reason this file exists: a string here reaches the wallet totals and
  // turns real money into string concatenation.
  it("rejects shares sent as a string", () => {
    expect(() => parseWatchlistResponse({ items: [{ ...item, shares: "12" }] })).toThrow(ResponseShapeError);
  });

  it("rejects NaN, which passes a typeof check but poisons every total", () => {
    expect(() => parseWatchlistResponse({ items: [{ ...item, costBasis: Number.NaN }] })).toThrow(
      ResponseShapeError
    );
  });

  // The backend enforces this pairing and the wallet maths assumes it.
  it("rejects shares without a cost basis", () => {
    expect(() => parseWatchlistResponse({ items: [{ ...item, costBasis: null }] })).toThrow(ResponseShapeError);
  });

  it("fails the batch rather than silently dropping a bad row", () => {
    expect(() => parseWatchlistResponse({ items: [item, { ...item, id: 42 }] })).toThrow(ResponseShapeError);
  });

  it("rejects a non-array where a list belongs", () => {
    expect(() => parseWatchlistResponse({ items: "nope" })).toThrow(ResponseShapeError);
  });
});

describe("parseHistoryResponse", () => {
  it("accepts well-formed candles", () => {
    expect(parseHistoryResponse({ candles: [candle], source: "massive" }).candles).toEqual([candle]);
  });

  it("rejects a candle with a missing field", () => {
    const { volume: _volume, ...partial } = candle;
    expect(() => parseHistoryResponse({ candles: [partial] })).toThrow(ResponseShapeError);
  });

  it("rejects Infinity, which would break every chart axis it touches", () => {
    expect(() => parseHistoryResponse({ candles: [{ ...candle, high: Infinity }] })).toThrow(
      ResponseShapeError
    );
  });

  it("falls back rather than throwing when only the source is odd", () => {
    expect(parseHistoryResponse({ candles: [candle], source: 7 }).source).toBe("unknown");
  });
});

describe("parseAlertsResponse", () => {
  const alert = {
    id: "a1",
    symbol: "AAPL",
    threshold: 200,
    direction: "above",
    createdAt: "2026-09-01T00:00:00.000Z",
    triggeredAt: null,
  };

  it("accepts a well-formed alert", () => {
    expect(parseAlertsResponse({ alerts: [alert] }).alerts).toEqual([alert]);
  });

  it("rejects a direction outside the union", () => {
    expect(() => parseAlertsResponse({ alerts: [{ ...alert, direction: "sideways" }] })).toThrow(
      ResponseShapeError
    );
  });
});

describe("parseHistoryResponse against the shape the server actually sends", () => {
  // Copied from a live GET /api/history/AAPL?days=7. Every candle fixture in
  // the suite used a numeric time, so the whole thing agreed with a frontend
  // type that disagreed with the backend — and the charts threw in production
  // while 389 tests stayed green.
  const production = {
    candles: [
      { time: "2026-09-04", open: 336, high: 338.9, low: 331.18, close: 331.65, volume: 1903345 },
      { time: "2026-09-05", open: 331.65, high: 331.67, low: 324.85, close: 326.91, volume: 3936782 },
    ],
    source: "massive",
  };

  it("reads it", () => {
    const parsed = parseHistoryResponse(production);

    expect(parsed.source).toBe("massive");
    expect(parsed.candles).toHaveLength(2);
    expect(parsed.candles[0]?.time).toBe("2026-09-04");
    expect(parsed.candles[0]?.close).toBe(331.65);
  });

  it("still rejects a candle whose prices aren't numbers", () => {
    expect(() =>
      parseHistoryResponse({ candles: [{ ...production.candles[0], close: "331.65" }], source: "massive" })
    ).toThrow(ResponseShapeError);
  });

  it("still rejects a candle with no date", () => {
    expect(() =>
      parseHistoryResponse({ candles: [{ ...production.candles[0], time: "" }], source: "massive" })
    ).toThrow(ResponseShapeError);
  });
});
