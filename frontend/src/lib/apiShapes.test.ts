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

const candle = { time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 };

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
