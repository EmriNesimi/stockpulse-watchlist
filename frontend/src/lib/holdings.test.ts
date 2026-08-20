import { describe, expect, it } from "vitest";
import { portfolioTotals, toHoldings, valueHolding } from "./holdings";
import type { WatchlistItem } from "./api";
import type { PriceState } from "../types";

function item(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: overrides.symbol ?? "1",
    symbol: "AAPL",
    name: "Apple Inc.",
    addedAt: "2026-01-01",
    shares: null,
    costBasis: null,
    ...overrides,
  };
}

function price(value: number): PriceState {
  return { price: value, changePercent: 0, source: "simulated", history: [] };
}

describe("toHoldings", () => {
  it("keeps only rows that have both shares and cost basis", () => {
    const holdings = toHoldings([
      item({ symbol: "AAPL", shares: 10, costBasis: 100 }),
      item({ symbol: "TSLA" }),
    ]);

    expect(holdings).toHaveLength(1);
    expect(holdings[0]!.item.symbol).toBe("AAPL");
  });

  it("skips a row with only one of the two set", () => {
    expect(toHoldings([item({ shares: 10, costBasis: null })])).toHaveLength(0);
    expect(toHoldings([item({ shares: null, costBasis: 100 })])).toHaveLength(0);
  });
});

describe("valueHolding", () => {
  it("computes cost, market value and gain from the live price", () => {
    const [holding] = toHoldings([item({ symbol: "AAPL", shares: 10, costBasis: 100 })]);

    const valued = valueHolding(holding!, { AAPL: price(120) });

    expect(valued.cost).toBe(1000);
    expect(valued.marketValue).toBe(1200);
    expect(valued.gain).toBe(200);
    expect(valued.gainPercent).toBeCloseTo(20);
  });

  it("reports a loss as a negative gain", () => {
    const [holding] = toHoldings([item({ symbol: "AAPL", shares: 4, costBasis: 50 })]);

    const valued = valueHolding(holding!, { AAPL: price(25) });

    expect(valued.gain).toBe(-100);
    expect(valued.gainPercent).toBeCloseTo(-50);
  });

  it("leaves value and gain undefined until a price arrives", () => {
    const [holding] = toHoldings([item({ symbol: "AAPL", shares: 10, costBasis: 100 })]);

    const valued = valueHolding(holding!, {});

    expect(valued.cost).toBe(1000); // knowable without a price
    expect(valued.marketValue).toBeUndefined();
    expect(valued.gain).toBeUndefined();
    expect(valued.gainPercent).toBeUndefined();
  });
});

describe("portfolioTotals", () => {
  it("sums cost, value and gain across holdings", () => {
    const holdings = toHoldings([
      item({ symbol: "AAPL", shares: 10, costBasis: 100 }),
      item({ symbol: "TSLA", shares: 2, costBasis: 200 }),
    ]);
    const prices = { AAPL: price(120), TSLA: price(150) };

    const totals = portfolioTotals(holdings.map((h) => valueHolding(h, prices)));

    expect(totals.cost).toBe(1400); // 1000 + 400
    expect(totals.marketValue).toBe(1500); // 1200 + 300
    expect(totals.gain).toBe(100);
    expect(totals.gainPercent).toBeCloseTo((100 / 1400) * 100);
  });

  it("withholds the total while any holding is still unpriced", () => {
    const holdings = toHoldings([
      item({ symbol: "AAPL", shares: 10, costBasis: 100 }),
      item({ symbol: "TSLA", shares: 2, costBasis: 200 }),
    ]);

    const totals = portfolioTotals(holdings.map((h) => valueHolding(h, { AAPL: price(120) })));

    expect(totals.cost).toBe(1400);
    expect(totals.marketValue).toBeUndefined();
    expect(totals.gain).toBeUndefined();
  });

  it("returns zeroed totals for an empty portfolio", () => {
    const totals = portfolioTotals([]);

    expect(totals.cost).toBe(0);
    expect(totals.marketValue).toBe(0);
    expect(totals.gainPercent).toBeUndefined(); // no cost to divide by
  });
});
