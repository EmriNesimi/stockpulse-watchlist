import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StatsRow from "./StatsRow";
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

function price(overrides: Partial<PriceState> = {}): PriceState {
  return { price: 100, changePercent: 0, source: "simulated", history: [], ...overrides };
}

describe("StatsRow", () => {
  it("renders nothing when the watchlist is empty", () => {
    const { container } = render(<StatsRow items={[]} prices={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the tracked count", () => {
    render(
      <StatsRow
        items={[item({ id: "1", symbol: "AAPL" }), item({ id: "2", symbol: "MSFT" })]}
        prices={{}}
      />
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("counts gainers and losers from real price data only", () => {
    render(
      <StatsRow
        items={[
          item({ id: "1", symbol: "AAPL" }),
          item({ id: "2", symbol: "MSFT" }),
          item({ id: "3", symbol: "TSLA" }),
        ]}
        prices={{
          AAPL: price({ changePercent: 1.5 }),
          MSFT: price({ changePercent: -0.5 }),
          // TSLA has no price data yet - shouldn't count toward either bucket
        }}
      />
    );

    const gainersCard = screen.getByText("Gainers").closest("div")!;
    const losersCard = screen.getByText("Losers").closest("div")!;
    expect(gainersCard).toHaveTextContent("1");
    expect(losersCard).toHaveTextContent("1");
  });

  it("shows a dash for average change when no price data has arrived yet", () => {
    render(<StatsRow items={[item()]} prices={{}} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("computes the average change across items with price data", () => {
    render(
      <StatsRow
        items={[item({ id: "1", symbol: "AAPL" }), item({ id: "2", symbol: "MSFT" })]}
        prices={{
          AAPL: price({ changePercent: 2 }),
          MSFT: price({ changePercent: 4 }),
        }}
      />
    );
    expect(screen.getByText("+3.00%")).toBeInTheDocument();
  });

  it("treats exactly zero change as a gainer, not a loser", () => {
    render(
      <StatsRow items={[item({ id: "1", symbol: "AAPL" })]} prices={{ AAPL: price({ changePercent: 0 }) }} />
    );
    const gainersCard = screen.getByText("Gainers").closest("div")!;
    expect(gainersCard).toHaveTextContent("1");
  });
});
