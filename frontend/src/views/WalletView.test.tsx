import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import WalletView from "./WalletView";
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

// With a single holding the summary and its table row legitimately show the
// same figures, so assertions say which of the two they mean.
function summary() {
  return within(screen.getByRole("region", { name: "Total value" }));
}

describe("WalletView", () => {
  it("prompts to add a position when nothing is held", () => {
    render(<WalletView items={[item()]} prices={{}} />);

    expect(screen.getByText("No positions yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the totals for a single position", () => {
    render(<WalletView items={[item({ symbol: "AAPL", shares: 10, costBasis: 100 })]} prices={{ AAPL: price(120) }} />);

    expect(summary().getByText("$1,200.00")).toBeInTheDocument(); // total value
    expect(summary().getByText("$1,000.00")).toBeInTheDocument(); // total cost
    expect(summary().getByText("+$200.00 (+20.00%)")).toBeInTheDocument();
  });

  it("sums across several positions", () => {
    render(
      <WalletView
        items={[
          item({ symbol: "AAPL", shares: 10, costBasis: 100 }),
          item({ symbol: "TSLA", shares: 2, costBasis: 200 }),
        ]}
        prices={{ AAPL: price(120), TSLA: price(150) }}
      />
    );

    // cost 1000 + 400 = 1400, value 1200 + 300 = 1500, gain 100
    expect(summary().getByText("$1,500.00")).toBeInTheDocument();
    expect(summary().getByText("$1,400.00")).toBeInTheDocument();
    expect(summary().getByText("+$100.00 (+7.14%)")).toBeInTheDocument();
  });

  it("shows a loss in the negative", () => {
    render(<WalletView items={[item({ symbol: "AAPL", shares: 4, costBasis: 50 })]} prices={{ AAPL: price(25) }} />);

    expect(summary().getByText("-$100.00 (-50.00%)")).toBeInTheDocument();
  });

  it("withholds the total rather than showing a partial sum while a price is missing", () => {
    render(
      <WalletView
        items={[
          item({ symbol: "AAPL", shares: 10, costBasis: 100 }),
          item({ symbol: "TSLA", shares: 2, costBasis: 200 }),
        ]}
        prices={{ AAPL: price(120) }} // TSLA hasn't ticked yet
      />
    );

    expect(summary().getByText("Waiting for prices on every holding…")).toBeInTheDocument();
    // Cost is knowable without any price, so it still shows.
    expect(summary().getByText("$1,400.00")).toBeInTheDocument();
    // No total value, rather than a partial sum that silently omits TSLA.
    expect(summary().queryByText("$1,200.00")).not.toBeInTheDocument();
    // Both the headline value and the profit figure hold back.
    expect(summary().getAllByText("—")).toHaveLength(2);
  });

  it("lists a row per holding with its own figures", () => {
    render(
      <WalletView
        items={[item({ symbol: "AAPL", shares: 10, costBasis: 100 }), item({ symbol: "TSLA" })]}
        prices={{ AAPL: price(120), TSLA: price(200) }}
      />
    );

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(2); // header + one holding
    expect(within(rows[1]).getByText("AAPL")).toBeInTheDocument();
    expect(within(rows[1]).getByText("10")).toBeInTheDocument();
  });

  it("counts the positions, not the whole watchlist", () => {
    render(
      <WalletView
        items={[item({ symbol: "AAPL", shares: 10, costBasis: 100 }), item({ symbol: "TSLA" })]}
        prices={{ AAPL: price(120) }}
      />
    );

    const figures = summary().getByText("Positions").parentElement!;
    expect(within(figures).getByText("1")).toBeInTheDocument();
  });
});
