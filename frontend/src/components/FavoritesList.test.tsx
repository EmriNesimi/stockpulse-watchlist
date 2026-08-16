import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FavoritesList from "./FavoritesList";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";

function item(symbol: string): WatchlistItem {
  return { id: symbol, symbol, name: `${symbol} Inc.`, addedAt: "2026-01-01", shares: null, costBasis: null };
}

function price(value: number, changePercent = 0): PriceState {
  return { price: value, changePercent, source: "simulated", history: [] };
}

describe("FavoritesList", () => {
  it("shows an empty message when there's nothing to watch", () => {
    render(<FavoritesList items={[]} prices={{}} onSelect={vi.fn()} />);

    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument();
  });

  it("renders a row per ticker with its price and change", () => {
    render(
      <FavoritesList items={[item("AAPL")]} prices={{ AAPL: price(123.45, 1.5) }} onSelect={vi.fn()} />
    );

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("$123.45")).toBeInTheDocument();
    expect(screen.getByText("+1.50%")).toBeInTheDocument();
  });

  it("shows dashes for a ticker that has no price yet", () => {
    render(<FavoritesList items={[item("AAPL")]} prices={{}} onSelect={vi.fn()} />);

    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("caps the list at five rows and says how many were hidden", () => {
    const items = ["A", "B", "C", "D", "E", "F", "G"].map(item);

    render(<FavoritesList items={items} prices={{}} onSelect={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByText("5 of 7")).toBeInTheDocument();
    expect(screen.queryByText("F")).not.toBeInTheDocument();
  });

  it("doesn't show a count when everything fits", () => {
    render(<FavoritesList items={[item("AAPL")]} prices={{}} onSelect={vi.fn()} />);

    expect(screen.queryByText(/ of /)).not.toBeInTheDocument();
  });

  it("calls onSelect with the symbol that was clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<FavoritesList items={[item("AAPL"), item("TSLA")]} prices={{}} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Open TSLA" }));

    expect(onSelect).toHaveBeenCalledWith("TSLA");
  });
});
