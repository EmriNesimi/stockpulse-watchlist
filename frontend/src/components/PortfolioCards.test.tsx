import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PortfolioCards from "./PortfolioCards";
import type { WatchlistItem } from "../lib/api";
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

describe("PortfolioCards", () => {
  it("prompts to add a position when nothing is held", () => {
    render(<PortfolioCards items={[item()]} prices={{}} />);

    expect(screen.getByText("No positions yet")).toBeInTheDocument();
  });

  it("prompts to add a position when the watchlist is empty", () => {
    render(<PortfolioCards items={[]} prices={{}} />);

    expect(screen.getByText("No positions yet")).toBeInTheDocument();
  });

  it("shows shares, market value and return for a held ticker", () => {
    render(
      <PortfolioCards
        items={[item({ symbol: "AAPL", shares: 10, costBasis: 100 })]}
        prices={{ AAPL: price(120) }}
      />
    );

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("$1,200.00")).toBeInTheDocument();
    expect(screen.getByText("+$200.00 (+20.00%)")).toBeInTheDocument();
  });

  it("shows a loss with a negative sign", () => {
    render(
      <PortfolioCards items={[item({ symbol: "AAPL", shares: 4, costBasis: 50 })]} prices={{ AAPL: price(25) }} />
    );

    expect(screen.getByText("-$100.00 (-50.00%)")).toBeInTheDocument();
  });

  it("falls back to a dash instead of a number while the price is missing", () => {
    render(<PortfolioCards items={[item({ symbol: "AAPL", shares: 10, costBasis: 100 })]} prices={{}} />);

    expect(screen.getAllByText("—")).toHaveLength(2); // market value and return
  });

  it("only renders cards for tickers that are actually held", () => {
    render(
      <PortfolioCards
        items={[item({ symbol: "AAPL", shares: 10, costBasis: 100 }), item({ symbol: "TSLA" })]}
        prices={{ AAPL: price(120), TSLA: price(200) }}
      />
    );

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.queryByText("TSLA")).not.toBeInTheDocument();
  });
});
