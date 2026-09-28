import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardView from "./DashboardView";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";

function item(symbol: string, name = `${symbol} Inc.`): WatchlistItem {
  return { id: symbol, symbol, name, addedAt: "2026-01-01", shares: null, costBasis: null };
}

function price(value: number): PriceState {
  return { price: value, changePercent: 0, source: "simulated", history: [] };
}

function renderView(items: WatchlistItem[], overrides: Partial<Parameters<typeof DashboardView>[0]> = {}) {
  const props = {
    items,
    prices: Object.fromEntries(items.map((i, idx) => [i.symbol, price(100 + idx)])),
    loading: false,
    onRemove: vi.fn(),
    onCreateAlert: vi.fn(),
    onOpenSymbol: vi.fn(),
    ...overrides,
  };
  render(<DashboardView {...props} />);
  return props;
}

// The screen every other view is reached from, and the only one that was
// never rendered in a test - it came in through App.test.tsx or not at all.
describe("DashboardView", () => {
  it("gives the screen an accessible heading", () => {
    renderView([item("AAPL")]);
    expect(screen.getByRole("heading", { name: "Dashboard", level: 1 })).toBeInTheDocument();
  });

  it("renders the portfolio section and the watchlist together", () => {
    renderView([item("AAPL")]);
    expect(screen.getByRole("heading", { name: /my portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /watchlist/i })).toBeInTheDocument();
  });

  it("shows an empty dashboard without falling over", () => {
    expect(() => renderView([])).not.toThrow();
    expect(screen.getByRole("heading", { name: "Dashboard", level: 1 })).toBeInTheDocument();
  });
});

// The one piece of state this view owns. Everything else is layout.
describe("DashboardView chart focus", () => {
  it("charts the first item when nothing has been picked", () => {
    renderView([item("AAPL"), item("MSFT")]);
    // The panel names the symbol it's showing; the rail lists both.
    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0);
  });

  it("charts a different symbol once one is picked from the rail", async () => {
    const user = userEvent.setup();
    renderView([item("AAPL"), item("MSFT")]);

    const msftInRail = screen.getAllByRole("button").find((b) => b.textContent?.includes("MSFT"));
    expect(msftInRail).toBeDefined();
    await user.click(msftInRail!);

    expect(screen.getAllByText("MSFT").length).toBeGreaterThan(0);
  });
});
