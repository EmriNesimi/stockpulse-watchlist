import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WatchlistRow from "./WatchlistRow";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";

function item(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return { id: "1", symbol: "AAPL", name: "Apple Inc.", addedAt: "2026-01-01", shares: null, costBasis: null, ...overrides };
}

function price(overrides: Partial<PriceState> = {}): PriceState {
  return { price: 100, changePercent: 0, source: "simulated", history: [], ...overrides };
}

function renderRow(props: Partial<Parameters<typeof WatchlistRow>[0]> = {}) {
  const full = {
    item: item(),
    state: price(),
    striped: false,
    alertOpen: false,
    onRemove: vi.fn(),
    onToggleAlert: vi.fn(),
    onSelectSymbol: vi.fn(),
    registerBellRef: vi.fn(),
    ...props,
  };
  render(
    <table>
      <tbody>
        <WatchlistRow {...full} />
      </tbody>
    </table>
  );
  return full;
}

// Covered through WatchlistTable's suite until now, which is fine for the
// table's own behaviour but leaves the row's contract - the callbacks it
// fires and the direction it shows - asserted only indirectly.
describe("WatchlistRow", () => {
  it("shows the symbol and name", () => {
    renderRow();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
  });

  it("opens the symbol when the row is activated", async () => {
    const user = userEvent.setup();
    const { onSelectSymbol } = renderRow();

    await user.click(screen.getByText("AAPL"));

    expect(onSelectSymbol).toHaveBeenCalledWith("AAPL");
  });

  it("removes without opening the symbol", async () => {
    const user = userEvent.setup();
    const { onRemove, onSelectSymbol } = renderRow();

    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(onRemove).toHaveBeenCalledWith("AAPL");
    // The remove button sits inside a clickable row; if the click bubbled,
    // removing a ticker would also navigate to the screen for it.
    expect(onSelectSymbol).not.toHaveBeenCalled();
  });

  it("toggles the alert form without opening the symbol", async () => {
    const user = userEvent.setup();
    const { onToggleAlert, onSelectSymbol } = renderRow();

    await user.click(screen.getByRole("button", { name: /alert/i }));

    expect(onToggleAlert).toHaveBeenCalledWith("AAPL");
    expect(onSelectSymbol).not.toHaveBeenCalled();
  });

  it("shows placeholder dashes before the first tick", () => {
    renderRow({ state: undefined });
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
