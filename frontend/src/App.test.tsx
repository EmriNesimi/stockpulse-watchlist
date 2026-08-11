import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  createAlert,
  searchTickers,
} from "./lib/api";
import type { WatchlistItem } from "./lib/api";

// App composes real child components (Search, WatchlistTable, etc.) rather
// than mocking them — this is an integration test of the wiring between
// them, not another round of unit tests for pieces already covered
// individually. Only the two actual I/O boundaries are faked: the REST API
// client and the WebSocket global.
vi.mock("./lib/api", () => ({
  API_BASE: "http://test-api",
  getWatchlist: vi.fn(),
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
  createAlert: vi.fn(),
  removeAlert: vi.fn(),
  getAlerts: vi.fn(),
  searchTickers: vi.fn(),
}));

// Matches the browser WebSocket API — same shape as useLiveTicks.test.ts's
// fake, since App mounts the real useLiveTicks hook.
class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  triggerOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  triggerMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

vi.stubGlobal("WebSocket", FakeWebSocket);

function watchlistItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: overrides.symbol ?? "1",
    symbol: "AAPL",
    name: "Apple Inc.",
    addedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.mocked(getWatchlist).mockReset().mockResolvedValue({ items: [] });
  vi.mocked(addToWatchlist).mockReset();
  vi.mocked(removeFromWatchlist).mockReset();
  vi.mocked(createAlert).mockReset();
  vi.mocked(searchTickers).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("App — initial load", () => {
  it("fetches the watchlist on mount and renders the empty state when there's nothing", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({ items: [] });
    render(<App />);

    expect(getWatchlist).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument());
  });

  it("shows a loading state while getWatchlist is in flight, then swaps to the loaded items", async () => {
    let resolveWatchlist: (value: { items: WatchlistItem[] }) => void;
    vi.mocked(getWatchlist).mockReturnValue(
      new Promise((resolve) => {
        resolveWatchlist = resolve;
      })
    );
    render(<App />);

    expect(screen.getByText(/loading your watchlist/i)).toBeInTheDocument();
    expect(screen.queryByText(/nothing on your watchlist yet/i)).not.toBeInTheDocument();

    act(() => resolveWatchlist({ items: [watchlistItem({ symbol: "AAPL" })] }));

    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));
    expect(screen.queryByText(/loading your watchlist/i)).not.toBeInTheDocument();
  });

  it("renders items returned from getWatchlist", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({
      items: [watchlistItem({ symbol: "AAPL" }), watchlistItem({ symbol: "MSFT", id: "2", name: "Microsoft" })],
    });
    render(<App />);

    await waitFor(() => expect(screen.getByText("AAPL")).toBeInTheDocument());
    expect(screen.getByText("MSFT")).toBeInTheDocument();
  });

  it("doesn't crash the app if the initial watchlist fetch fails", async () => {
    vi.mocked(getWatchlist).mockRejectedValue(new Error("network down"));
    render(<App />);

    // Falls back to the empty state rather than an unhandled rejection.
    await waitFor(() => expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument());
  });

  it("shows an error toast if the initial watchlist fetch fails", async () => {
    vi.mocked(getWatchlist).mockRejectedValue(new Error("network down"));
    render(<App />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load your watchlist/i));
  });

  it("renders the StockPulse header and connection badge", async () => {
    render(<App />);
    expect(screen.getByText("StockPulse")).toBeInTheDocument();
    // role="status" doesn't compute an accessible name from its content per
    // the ARIA name-computation rules (that's only for roles like button/
    // link/heading), so `getByRole("status", { name: ... })` can't find it
    // by its visible text — confirmed by checking testing-library's role
    // dump, not an app bug. Three status regions exist at this point (the
    // connection badge, the aria-live announcer, and WatchlistTable's
    // "Loading your watchlist…" placeholder before the fetch settles), so
    // just confirm they're present and check the badge's text directly.
    expect(screen.getAllByRole("status")).toHaveLength(3);
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
  });

  it("opens a websocket connection on mount", () => {
    render(<App />);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe("App — search and add to watchlist", () => {
  it("adds a searched ticker to the watchlist when clicked", async () => {
    vi.mocked(searchTickers).mockResolvedValue({
      results: [{ symbol: "AAPL", name: "Apple Inc." }],
      source: "massive",
    });
    vi.mocked(addToWatchlist).mockResolvedValue({ item: watchlistItem({ symbol: "AAPL" }) });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/search for a stock ticker/i), "apple");
    await waitFor(() => screen.getByRole("option", { name: /AAPL/ }), { timeout: 2000 });
    await user.click(screen.getByRole("option", { name: /AAPL/ }));

    expect(addToWatchlist).toHaveBeenCalledWith("AAPL", "Apple Inc.");
    await waitFor(() => expect(screen.queryByText(/nothing on your watchlist yet/i)).not.toBeInTheDocument());
    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0); // in the table now
  }, 10000);

  it("doesn't add anything to the table if addToWatchlist fails", async () => {
    vi.mocked(searchTickers).mockResolvedValue({
      results: [{ symbol: "AAPL", name: "Apple Inc." }],
      source: "massive",
    });
    vi.mocked(addToWatchlist).mockRejectedValue(new Error("AAPL is already on the watchlist"));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/search for a stock ticker/i), "apple");
    await waitFor(() => screen.getByRole("option", { name: /AAPL/ }), { timeout: 2000 });
    await user.click(screen.getByRole("option", { name: /AAPL/ }));

    await waitFor(() => expect(addToWatchlist).toHaveBeenCalled());
    // The empty state should still be showing — the add never actually landed.
    expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't add aapl/i);
  }, 10000);

  it("marks an already-added symbol as disabled in future search results", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({ items: [watchlistItem({ symbol: "AAPL" })] });
    vi.mocked(searchTickers).mockResolvedValue({
      results: [{ symbol: "AAPL", name: "Apple Inc." }],
      source: "massive",
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));

    await user.type(screen.getByLabelText(/search for a stock ticker/i), "apple");

    await waitFor(() => expect(screen.getByRole("option", { name: /AAPL/ })).toBeDisabled(), {
      timeout: 2000,
    });
  }, 10000);
});

describe("App — removing from the watchlist", () => {
  it("removes the item from the table (optimistically) when removeFromWatchlist succeeds", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({ items: [watchlistItem({ symbol: "AAPL" })] });
    vi.mocked(removeFromWatchlist).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Remove AAPL from watchlist" }));

    expect(removeFromWatchlist).toHaveBeenCalledWith("AAPL");
    await waitFor(() => expect(screen.getByText(/nothing on your watchlist yet/i)).toBeInTheDocument());
  });

  it("rolls the item back into the table if removeFromWatchlist fails", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({ items: [watchlistItem({ symbol: "AAPL" })] });
    vi.mocked(removeFromWatchlist).mockRejectedValue(new Error("server error"));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Remove AAPL from watchlist" }));

    // Optimistically removed first...
    await waitFor(() => expect(removeFromWatchlist).toHaveBeenCalled());
    // ...then rolled back once the rejection comes through.
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));
  });

  it("removing one item doesn't affect the others", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({
      items: [watchlistItem({ id: "1", symbol: "AAPL" }), watchlistItem({ id: "2", symbol: "MSFT" })],
    });
    vi.mocked(removeFromWatchlist).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Remove AAPL from watchlist" }));

    await waitFor(() => expect(screen.queryByText("AAPL")).not.toBeInTheDocument());
    expect(screen.getByText("MSFT")).toBeInTheDocument();
  });
});

describe("App — live connection status and price updates", () => {
  it("shows 'Connected' once the websocket opens", async () => {
    render(<App />);
    expect(screen.getByText("Connecting…")).toBeInTheDocument();

    act(() => FakeWebSocket.instances[0].triggerOpen());

    await waitFor(() => expect(screen.getByText("Connected")).toBeInTheDocument());
  });

  it("subscribes to every watchlist symbol once connected", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({
      items: [watchlistItem({ id: "1", symbol: "AAPL" }), watchlistItem({ id: "2", symbol: "MSFT" })],
    });
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));

    act(() => FakeWebSocket.instances[0].triggerOpen());

    const sent = FakeWebSocket.instances[0].sent.map((s) => JSON.parse(s));
    expect(sent).toContainEqual({ action: "subscribe", symbols: ["AAPL", "MSFT"] });
  });

  it("updates the price shown in the table when a tick arrives", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({ items: [watchlistItem({ symbol: "AAPL" })] });
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));
    act(() => FakeWebSocket.instances[0].triggerOpen());

    act(() => {
      FakeWebSocket.instances[0].triggerMessage({
        type: "tick",
        symbol: "AAPL",
        price: 231.5,
        changePercent: 1.2,
        source: "live",
      });
    });

    await waitFor(() => expect(screen.getByText("$231.50")).toBeInTheDocument());
  });

  it("only updates the row for the symbol the tick is for", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({
      items: [watchlistItem({ id: "1", symbol: "AAPL" }), watchlistItem({ id: "2", symbol: "MSFT" })],
    });
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));
    act(() => FakeWebSocket.instances[0].triggerOpen());

    act(() => {
      FakeWebSocket.instances[0].triggerMessage({
        type: "tick",
        symbol: "AAPL",
        price: 200,
        changePercent: 0,
        source: "live",
      });
    });

    await waitFor(() => expect(screen.getByText("$200.00")).toBeInTheDocument());
    // MSFT never got a tick — still showing its placeholder dash somewhere.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows 'Reconnecting…' if the connection drops", async () => {
    render(<App />);
    act(() => FakeWebSocket.instances[0].triggerOpen());
    await waitFor(() => expect(screen.getByText("Connected")).toBeInTheDocument());

    act(() => {
      FakeWebSocket.instances[0].readyState = FakeWebSocket.CLOSED;
      FakeWebSocket.instances[0].onclose?.();
    });

    await waitFor(() => expect(screen.getByText("Reconnecting…")).toBeInTheDocument());
  });
});

describe("App — creating a price alert", () => {
  it("calls createAlert with the right symbol/threshold/direction from the bell form", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({ items: [watchlistItem({ symbol: "AAPL" })] });
    vi.mocked(createAlert).mockResolvedValue({
      alert: {
        id: "a1",
        symbol: "AAPL",
        threshold: 200,
        direction: "above",
        createdAt: "2026-01-01T00:00:00.000Z",
        triggeredAt: null,
      },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Set a price alert for AAPL" }));
    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "200");
    await user.click(screen.getByRole("button", { name: "Set" }));

    expect(createAlert).toHaveBeenCalledWith("AAPL", 200, "above");
  });

  it("closes the inline form after submitting, even though createAlert doesn't update the table", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({ items: [watchlistItem({ symbol: "AAPL" })] });
    vi.mocked(createAlert).mockResolvedValue({
      alert: {
        id: "a1",
        symbol: "AAPL",
        threshold: 200,
        direction: "above",
        createdAt: "2026-01-01T00:00:00.000Z",
        triggeredAt: null,
      },
    });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Set a price alert for AAPL" }));
    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "200");
    await user.click(screen.getByRole("button", { name: "Set" }));

    await waitFor(() =>
      expect(screen.queryByRole("form", { name: "Set a price alert for AAPL" })).not.toBeInTheDocument()
    );
  });

  it("doesn't crash the app if createAlert fails", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({ items: [watchlistItem({ symbol: "AAPL" })] });
    vi.mocked(createAlert).mockRejectedValue(new Error("server error"));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Set a price alert for AAPL" }));
    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "200");
    await user.click(screen.getByRole("button", { name: "Set" }));

    await waitFor(() => expect(createAlert).toHaveBeenCalled());
    // The app is still usable afterward — the watchlist row is still there.
    expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0);
  });

  it("shows an error toast if createAlert fails", async () => {
    vi.mocked(getWatchlist).mockResolvedValue({ items: [watchlistItem({ symbol: "AAPL" })] });
    vi.mocked(createAlert).mockRejectedValue(new Error("server error"));
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: "Set a price alert for AAPL" }));
    await user.type(screen.getByLabelText("Price threshold for AAPL alert"), "200");
    await user.click(screen.getByRole("button", { name: "Set" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't create the alert for aapl/i)
    );
  });
});

describe("App — receiving fired alerts", () => {
  it("shows a toast when an alert message arrives over the websocket", async () => {
    render(<App />);
    act(() => FakeWebSocket.instances[0].triggerOpen());

    act(() => {
      FakeWebSocket.instances[0].triggerMessage({
        type: "alert",
        id: "a1",
        symbol: "AAPL",
        threshold: 200,
        direction: "above",
        price: 210,
        triggeredAt: "2026-01-01T00:00:00.000Z",
      });
    });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("AAPL"));
  });

  it("dismisses the toast when its dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    act(() => FakeWebSocket.instances[0].triggerOpen());
    act(() => {
      FakeWebSocket.instances[0].triggerMessage({
        type: "alert",
        id: "a1",
        symbol: "AAPL",
        threshold: 200,
        direction: "above",
        price: 210,
        triggeredAt: "2026-01-01T00:00:00.000Z",
      });
    });
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Dismiss AAPL alert" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows multiple fired alerts as separate toasts", async () => {
    render(<App />);
    act(() => FakeWebSocket.instances[0].triggerOpen());

    act(() => {
      FakeWebSocket.instances[0].triggerMessage({
        type: "alert",
        id: "a1",
        symbol: "AAPL",
        threshold: 200,
        direction: "above",
        price: 210,
        triggeredAt: "2026-01-01T00:00:00.000Z",
      });
    });
    act(() => {
      FakeWebSocket.instances[0].triggerMessage({
        type: "alert",
        id: "a2",
        symbol: "MSFT",
        threshold: 300,
        direction: "below",
        price: 290,
        triggeredAt: "2026-01-01T00:00:01.000Z",
      });
    });

    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
  });
});
