import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WatchlistTable from "./WatchlistTable";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";

function item(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: overrides.symbol ?? "1",
    symbol: "AAPL",
    name: "Apple Inc.",
    addedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function price(overrides: Partial<PriceState> = {}): PriceState {
  return { price: 100, changePercent: 0, source: "simulated", history: [], ...overrides };
}

const noop = vi.fn();

describe("WatchlistTable — empty state", () => {
  it("shows a helpful message and no table when there are no items", () => {
    render(<WatchlistTable items={[]} prices={{}} onRemove={noop} onCreateAlert={noop} />);
    expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("WatchlistTable — rendering rows", () => {
  it("renders the symbol and name for each item", () => {
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL", name: "Apple Inc." })]}
        prices={{}}
        onRemove={noop}
        onCreateAlert={noop}
      />
    );
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
  });

  it("renders one row per item", () => {
    render(
      <WatchlistTable
        items={[item({ id: "1", symbol: "AAPL" }), item({ id: "2", symbol: "MSFT" })]}
        prices={{}}
        onRemove={noop}
        onCreateAlert={noop}
      />
    );
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
  });

  it("shows placeholder dashes for a symbol with no price data yet", () => {
    render(
      <WatchlistTable items={[item({ symbol: "AAPL" })]} prices={{}} onRemove={noop} onCreateAlert={noop} />
    );
    // PriceCell's dash and the change column's dash
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("shows the formatted price and change percent when price data is present", () => {
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{ AAPL: price({ price: 231.5, changePercent: 1.25 }) }}
        onRemove={noop}
        onCreateAlert={noop}
      />
    );
    expect(screen.getByText("$231.50")).toBeInTheDocument();
    expect(screen.getByText(/1\.25%/)).toBeInTheDocument();
  });

  it("shows a '+' prefix on a positive change and no prefix on a negative one", () => {
    const { rerender } = render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{ AAPL: price({ changePercent: 2 }) }}
        onRemove={noop}
        onCreateAlert={noop}
      />
    );
    expect(screen.getByText("+2.00%")).toBeInTheDocument();

    rerender(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{ AAPL: price({ changePercent: -2 }) }}
        onRemove={noop}
        onCreateAlert={noop}
      />
    );
    expect(screen.getByText("-2.00%")).toBeInTheDocument();
  });

  it("only shows price data for the symbol it belongs to, not other rows", () => {
    render(
      <WatchlistTable
        items={[item({ id: "1", symbol: "AAPL" }), item({ id: "2", symbol: "MSFT" })]}
        prices={{ AAPL: price({ price: 200 }) }}
        onRemove={noop}
        onCreateAlert={noop}
      />
    );
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    // MSFT has no price entry — its row shows the placeholder, not AAPL's price
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });
});
