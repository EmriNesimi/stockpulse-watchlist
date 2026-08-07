import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("renders the StockPulse header and connection badge", async () => {
    render(<App />);
    expect(screen.getByText("StockPulse")).toBeInTheDocument();
    // role="status" doesn't compute an accessible name from its content per
    // the ARIA name-computation rules (that's only for roles like button/
    // link/heading), so `getByRole("status", { name: ... })` can't find it
    // by its visible text — confirmed by checking testing-library's role
    // dump, not an app bug. Two status regions exist (this badge + the
    // aria-live announcer in App), so just confirm both are present and
    // check the badge's text directly.
    expect(screen.getAllByRole("status")).toHaveLength(2);
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
