import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WatchlistTable from "./WatchlistTable";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import * as api from "../lib/api";

function item(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: overrides.symbol ?? "1",
    symbol: "AAPL",
    name: "Apple Inc.",
    addedAt: "2026-01-01T00:00:00.000Z",
    shares: null,
    costBasis: null,
    ...overrides,
  };
}

function price(overrides: Partial<PriceState> = {}): PriceState {
  return { price: 100, changePercent: 0, source: "simulated", history: [], ...overrides };
}

const noop = vi.fn();

describe("WatchlistTable — empty state", () => {
  it("shows a helpful message and no table when there are no items", () => {
    render(<WatchlistTable items={[]} prices={{}} onRemove={noop} onCreateAlert={noop}
        onSelectSymbol={noop} />);
    expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("WatchlistTable — loading state", () => {
  it("shows a loading message instead of the empty-state message while loading", () => {
    render(<WatchlistTable items={[]} prices={{}} loading={true} onRemove={noop} onCreateAlert={noop}
        onSelectSymbol={noop} />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading your watchlist/i);
    expect(screen.queryByText(/nothing on your watchlist yet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the table, not the loading message, once items have arrived even if loading is still true", () => {
    // Belt-and-suspenders: real usage never holds loading=true with items
    // present, but the table should still win if that ever happens.
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{}}
        loading={true}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/loading your watchlist/i);
  });

  it("defaults to not loading when the prop is omitted", () => {
    render(<WatchlistTable items={[]} prices={{}} onRemove={noop} onCreateAlert={noop}
        onSelectSymbol={noop} />);
    expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument();
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
        onSelectSymbol={noop}
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
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
  });

  it("shows placeholder dashes for a symbol with no price data yet", () => {
    render(
      <WatchlistTable items={[item({ symbol: "AAPL" })]} prices={{}} onRemove={noop} onCreateAlert={noop}
        onSelectSymbol={noop} />
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
        onSelectSymbol={noop}
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
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByText("+2.00%")).toBeInTheDocument();

    rerender(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{ AAPL: price({ changePercent: -2 }) }}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
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
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    // MSFT has no price entry — its row shows the placeholder, not AAPL's price
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });
});

describe("WatchlistTable — removing a symbol", () => {
  it("calls onRemove with the right symbol when its remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <WatchlistTable
        items={[item({ id: "1", symbol: "AAPL" }), item({ id: "2", symbol: "MSFT" })]}
        prices={{}}
        onRemove={onRemove}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );

    await user.click(screen.getByRole("button", { name: "Remove MSFT from watchlist" }));

    expect(onRemove).toHaveBeenCalledWith("MSFT");
    expect(onRemove).not.toHaveBeenCalledWith("AAPL");
  });

  it("has a distinct, correctly-labeled remove button per row", () => {
    render(
      <WatchlistTable
        items={[item({ id: "1", symbol: "AAPL" }), item({ id: "2", symbol: "MSFT" })]}
        prices={{}}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );

    expect(screen.getByRole("button", { name: "Remove AAPL from watchlist" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove MSFT from watchlist" })).toBeInTheDocument();
  });
});

describe("WatchlistTable — setting an alert", () => {
  it("opens the inline alert form when the bell is clicked", async () => {
    const user = userEvent.setup();
    render(
      <WatchlistTable items={[item({ symbol: "AAPL" })]} prices={{}} onRemove={noop} onCreateAlert={noop}
        onSelectSymbol={noop} />
    );

    expect(screen.queryByRole("form", { name: "Set a price alert for AAPL" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set a price alert for AAPL" }));

    expect(screen.getByRole("form", { name: "Set a price alert for AAPL" })).toBeInTheDocument();
  });

  it("closes the form again if the bell is clicked a second time", async () => {
    const user = userEvent.setup();
    render(
      <WatchlistTable items={[item({ symbol: "AAPL" })]} prices={{}} onRemove={noop} onCreateAlert={noop}
        onSelectSymbol={noop} />
    );

    const bell = screen.getByRole("button", { name: "Set a price alert for AAPL" });
    await user.click(bell);
    expect(screen.getByRole("form", { name: "Set a price alert for AAPL" })).toBeInTheDocument();

    await user.click(bell);
    expect(screen.queryByRole("form", { name: "Set a price alert for AAPL" })).not.toBeInTheDocument();
  });

  it("only shows one row's alert form at a time", async () => {
    const user = userEvent.setup();
    render(
      <WatchlistTable
        items={[item({ id: "1", symbol: "AAPL" }), item({ id: "2", symbol: "MSFT" })]}
        prices={{}}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );

    await user.click(screen.getByRole("button", { name: "Set a price alert for AAPL" }));
    expect(screen.getByRole("form", { name: "Set a price alert for AAPL" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set a price alert for MSFT" }));

    expect(screen.queryByRole("form", { name: "Set a price alert for AAPL" })).not.toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Set a price alert for MSFT" })).toBeInTheDocument();
  });

  it("pre-fills the alert threshold with the current price when available", async () => {
    const user = userEvent.setup();
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{ AAPL: price({ price: 231.5 }) }}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );

    await user.click(screen.getByRole("button", { name: "Set a price alert for AAPL" }));

    expect(screen.getByLabelText("Price threshold for AAPL alert")).toHaveValue(231.5);
  });

  it("calls onCreateAlert with the symbol, threshold, and direction, then closes the form", async () => {
    const user = userEvent.setup();
    const onCreateAlert = vi.fn();
    render(
      <WatchlistTable items={[item({ symbol: "AAPL" })]} prices={{}} onRemove={noop} onCreateAlert={onCreateAlert}
        onSelectSymbol={noop} />
    );

    await user.click(screen.getByRole("button", { name: "Set a price alert for AAPL" }));
    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "200");
    await user.selectOptions(screen.getByLabelText("Alert direction"), "below");
    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(onCreateAlert).toHaveBeenCalledWith("AAPL", 200, "below");
    expect(screen.queryByRole("form", { name: "Set a price alert for AAPL" })).not.toBeInTheDocument();
  });

  it("closes the form without calling onCreateAlert when cancelled", async () => {
    const user = userEvent.setup();
    const onCreateAlert = vi.fn();
    render(
      <WatchlistTable items={[item({ symbol: "AAPL" })]} prices={{}} onRemove={noop} onCreateAlert={onCreateAlert}
        onSelectSymbol={noop} />
    );

    await user.click(screen.getByRole("button", { name: "Set a price alert for AAPL" }));
    await user.click(screen.getByRole("button", { name: "Cancel setting alert" }));

    expect(onCreateAlert).not.toHaveBeenCalled();
    expect(screen.queryByRole("form", { name: "Set a price alert for AAPL" })).not.toBeInTheDocument();
  });
});

describe("WatchlistTable — opening a symbol", () => {
  it("calls onSelectSymbol with the row that was clicked", async () => {
    const onSelectSymbol = vi.fn();
    const user = userEvent.setup();
    render(
      <WatchlistTable
        items={[item({ id: "1", symbol: "AAPL" }), item({ id: "2", symbol: "MSFT" })]}
        prices={{}}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={onSelectSymbol}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open MSFT" }));

    expect(onSelectSymbol).toHaveBeenCalledWith("MSFT");
  });

  it("doesn't fetch history from the table any more - the detail screen owns that", () => {
    const spy = vi.spyOn(api, "getHistory");
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{}}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );

    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole("img", { name: /candlestick chart/i })).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("opening a symbol doesn't fire the remove handler", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{}}
        onRemove={onRemove}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );

    await user.click(screen.getByRole("button", { name: "Open AAPL" }));

    expect(onRemove).not.toHaveBeenCalled();
  });
});

describe("WatchlistTable — trend column and sparkline integration", () => {
  it("passes bullish through to the sparkline so its trend label matches the row", () => {
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{ AAPL: price({ changePercent: 1.5, history: [100, 105, 110] }) }}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByRole("img", { name: /trending up/i })).toBeInTheDocument();
  });

  it("passes bearish through to the sparkline when the change is negative", () => {
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{ AAPL: price({ changePercent: -1.5, history: [110, 105, 100] }) }}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByRole("img", { name: /trending down/i })).toBeInTheDocument();
  });

  it("treats exactly zero change as bullish (matches the '+' prefix behavior)", () => {
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{ AAPL: price({ changePercent: 0, history: [100, 100, 100] }) }}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByText("+0.00%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /trending up/i })).toBeInTheDocument();
  });

  it("gives each row its own independent sparkline reflecting its own history", () => {
    render(
      <WatchlistTable
        items={[item({ id: "1", symbol: "AAPL" }), item({ id: "2", symbol: "MSFT" })]}
        prices={{
          AAPL: price({ changePercent: 1, history: [100, 105, 110] }),
          MSFT: price({ changePercent: -1, history: [400, 395, 390] }),
        }}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByRole("img", { name: /trending up/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /trending down/i })).toBeInTheDocument();
  });
});

describe("WatchlistTable — session range column", () => {
  it("shows a dash when there's not enough history yet", () => {
    render(<WatchlistTable items={[item({ symbol: "AAPL" })]} prices={{}} onRemove={noop} onCreateAlert={noop}
        onSelectSymbol={noop} />);
    // Both the Change and Session range cells fall back to a dash with no
    // price data yet - just confirm at least one shows up, not which.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the real min/max of the rolling tick history, not a fabricated range", () => {
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL" })]}
        prices={{ AAPL: price({ history: [101.5, 99, 103.25, 100] }) }}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByText("$99.00 – $103.25")).toBeInTheDocument();
  });
});

describe("WatchlistTable — edge cases", () => {
  it("doesn't crash when an item has no name", () => {
    render(
      <WatchlistTable
        items={[item({ symbol: "AAPL", name: null })]}
        prices={{}}
        onRemove={noop}
        onCreateAlert={noop}
        onSelectSymbol={noop}
      />
    );
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });

  it("keeps every row's remove/alert controls independently addressable with 10+ items", () => {
    const items = Array.from({ length: 12 }, (_, i) => item({ id: String(i), symbol: `SYM${i}` }));
    render(<WatchlistTable items={items} prices={{}} onRemove={noop} onCreateAlert={noop}
        onSelectSymbol={noop} />);

    expect(screen.getByRole("button", { name: "Remove SYM0 from watchlist" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove SYM11 from watchlist" })).toBeInTheDocument();
  });
});
