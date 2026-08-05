import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Matches the *browser* WebSocket API (onopen/onmessage/onclose property
// handlers, readyState + static constants) since useLiveTicks uses the
// global WebSocket directly — not the "ws" package's EventEmitter style
// used on the backend, so the mocking approach here is different from
// MassiveLiveFeed's tests despite looking similar on the surface.
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

  /** Test helper: the server accepted the connection. */
  triggerOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  /** Test helper: a message arrived from the server. */
  triggerMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  /** Test helper: the connection dropped (server closed it, network blip, etc). */
  triggerClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}

vi.stubGlobal("WebSocket", FakeWebSocket);

const { useLiveTicks } = await import("./useLiveTicks");

function latestSocket(): FakeWebSocket {
  const socket = FakeWebSocket.instances.at(-1);
  if (!socket) throw new Error("no FakeWebSocket instance was constructed");
  return socket;
}

function sentMessages(socket: FakeWebSocket) {
  return socket.sent.map((s) => JSON.parse(s));
}

describe("useLiveTicks", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in the connecting state and opens a socket immediately", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL"]));
    expect(result.current.status).toBe("connecting");
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("subscribes to the given symbols once the socket opens", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL", "MSFT"]));
    const socket = latestSocket();

    act(() => socket.triggerOpen());

    expect(result.current.status).toBe("open");
    expect(sentMessages(socket)).toContainEqual({ action: "subscribe", symbols: ["AAPL", "MSFT"] });
  });

  it("records a tick into prices when a message arrives", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL"]));
    const socket = latestSocket();
    act(() => socket.triggerOpen());

    act(() => {
      socket.triggerMessage({ type: "tick", symbol: "AAPL", price: 231.5, changePercent: 1.2, source: "live" });
    });

    expect(result.current.prices.AAPL).toMatchObject({
      price: 231.5,
      changePercent: 1.2,
      source: "live",
      history: [231.5],
    });
  });

  it("ignores non-tick messages instead of crashing", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL"]));
    const socket = latestSocket();
    act(() => socket.triggerOpen());

    act(() => socket.triggerMessage({ type: "error", message: "something else entirely" }));

    expect(result.current.prices).toEqual({});
  });

  it("keeps a rolling history capped at 30 points", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL"]));
    const socket = latestSocket();
    act(() => socket.triggerOpen());

    for (let i = 0; i < 35; i++) {
      act(() => {
        socket.triggerMessage({ type: "tick", symbol: "AAPL", price: i, changePercent: 0, source: "simulated" });
      });
    }

    expect(result.current.prices.AAPL.history).toHaveLength(30);
    expect(result.current.prices.AAPL.history[0]).toBe(5); // oldest 5 (0-4) dropped
    expect(result.current.prices.AAPL.history.at(-1)).toBe(34);
  });
});

describe("useLiveTicks — keeping subscriptions in sync with the watchlist", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it("sends a subscribe only for newly-added symbols, not ones already subscribed", () => {
    const { rerender } = renderHook(({ symbols }) => useLiveTicks(symbols), {
      initialProps: { symbols: ["AAPL"] },
    });
    const socket = latestSocket();
    act(() => socket.triggerOpen());
    expect(sentMessages(socket)).toContainEqual({ action: "subscribe", symbols: ["AAPL"] });

    rerender({ symbols: ["AAPL", "MSFT"] });

    const messages = sentMessages(socket);
    const subscribeMessages = messages.filter((m) => m.action === "subscribe");
    expect(subscribeMessages).toHaveLength(2);
    expect(subscribeMessages[1]).toEqual({ action: "subscribe", symbols: ["MSFT"] }); // only the new one
  });

  it("unsubscribes a symbol that's dropped off the watchlist and clears its price state", () => {
    const { result, rerender } = renderHook(({ symbols }) => useLiveTicks(symbols), {
      initialProps: { symbols: ["AAPL", "MSFT"] },
    });
    const socket = latestSocket();
    act(() => socket.triggerOpen());
    act(() => {
      socket.triggerMessage({ type: "tick", symbol: "AAPL", price: 100, changePercent: 0, source: "simulated" });
    });
    expect(result.current.prices.AAPL).toBeDefined();

    act(() => rerender({ symbols: ["MSFT"] }));

    expect(sentMessages(socket)).toContainEqual({ action: "unsubscribe", symbols: ["AAPL"] });
    expect(result.current.prices.AAPL).toBeUndefined(); // cleared, not left stale
  });

  it("does nothing when the symbol list is unchanged (no redundant messages)", () => {
    const { rerender } = renderHook(({ symbols }) => useLiveTicks(symbols), {
      initialProps: { symbols: ["AAPL"] },
    });
    const socket = latestSocket();
    act(() => socket.triggerOpen());
    const countAfterOpen = socket.sent.length;

    rerender({ symbols: ["AAPL"] }); // same symbols, new array reference

    expect(socket.sent.length).toBe(countAfterOpen);
  });
});

describe("useLiveTicks — reconnecting after a dropped connection", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
  });

  it("moves to reconnecting and opens a new socket with exponential backoff", () => {
    renderHook(() => useLiveTicks(["AAPL"]));
    const first = latestSocket();
    act(() => first.triggerOpen());

    act(() => first.triggerClose()); // connection dropped
    expect(FakeWebSocket.instances).toHaveLength(1); // hasn't reconnected yet

    act(() => vi.advanceTimersByTime(2000)); // base(1000) * 2^1
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("reports status as reconnecting between the drop and the next successful open", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL"]));
    const first = latestSocket();
    act(() => first.triggerOpen());
    expect(result.current.status).toBe("open");

    act(() => first.triggerClose());
    expect(result.current.status).toBe("reconnecting");

    act(() => vi.advanceTimersByTime(2000));
    const second = latestSocket();
    act(() => second.triggerOpen());
    expect(result.current.status).toBe("open");
  });

  it("resubscribes to the current watchlist on the reconnected socket", () => {
    renderHook(() => useLiveTicks(["AAPL", "MSFT"]));
    const first = latestSocket();
    act(() => first.triggerOpen());

    act(() => first.triggerClose());
    act(() => vi.advanceTimersByTime(2000));
    const second = latestSocket();
    act(() => second.triggerOpen());

    expect(sentMessages(second)).toContainEqual({ action: "subscribe", symbols: ["AAPL", "MSFT"] });
  });

  it("closes the socket and doesn't reconnect after the component unmounts", () => {
    // Note: result.current is a snapshot from the last actual render, and
    // unmounting means there's no render left to reflect the cleanup's
    // setStatus("closed") — that call is a legitimate no-op once torn down,
    // so what's actually observable (and worth testing) is the socket itself
    // and that no reconnect timer fires afterward.
    const { unmount } = renderHook(() => useLiveTicks(["AAPL"]));
    const socket = latestSocket();
    act(() => socket.triggerOpen());

    unmount();

    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);

    act(() => vi.advanceTimersByTime(60_000)); // give it plenty of time to (not) reconnect
    expect(FakeWebSocket.instances).toHaveLength(1); // no reconnect after unmount
  });
});

describe("useLiveTicks — price alerts", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it("records an alert event when an alert message arrives", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL"]));
    const socket = latestSocket();
    act(() => socket.triggerOpen());

    act(() => {
      socket.triggerMessage({
        type: "alert",
        id: "alert-1",
        symbol: "AAPL",
        threshold: 200,
        direction: "above",
        price: 210,
        triggeredAt: "2026-01-01T00:00:00.000Z",
      });
    });

    expect(result.current.alertEvents).toHaveLength(1);
    expect(result.current.alertEvents[0]).toMatchObject({
      id: "alert-1",
      symbol: "AAPL",
      threshold: 200,
      direction: "above",
      price: 210,
    });
  });

  it("keeps alert events separate from price state — doesn't affect prices", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL"]));
    const socket = latestSocket();
    act(() => socket.triggerOpen());

    act(() => {
      socket.triggerMessage({
        type: "alert",
        id: "alert-1",
        symbol: "AAPL",
        threshold: 200,
        direction: "above",
        price: 210,
        triggeredAt: "2026-01-01T00:00:00.000Z",
      });
    });

    expect(result.current.prices).toEqual({});
  });

  it("accumulates multiple alert events in order", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL", "MSFT"]));
    const socket = latestSocket();
    act(() => socket.triggerOpen());

    act(() => {
      socket.triggerMessage({
        type: "alert",
        id: "alert-1",
        symbol: "AAPL",
        threshold: 200,
        direction: "above",
        price: 210,
        triggeredAt: "2026-01-01T00:00:00.000Z",
      });
    });
    act(() => {
      socket.triggerMessage({
        type: "alert",
        id: "alert-2",
        symbol: "MSFT",
        threshold: 300,
        direction: "below",
        price: 290,
        triggeredAt: "2026-01-01T00:00:01.000Z",
      });
    });

    expect(result.current.alertEvents.map((a) => a.id)).toEqual(["alert-1", "alert-2"]);
  });

  it("dismissAlert removes just that one alert", () => {
    const { result } = renderHook(() => useLiveTicks(["AAPL"]));
    const socket = latestSocket();
    act(() => socket.triggerOpen());

    act(() => {
      socket.triggerMessage({
        type: "alert",
        id: "alert-1",
        symbol: "AAPL",
        threshold: 200,
        direction: "above",
        price: 210,
        triggeredAt: "2026-01-01T00:00:00.000Z",
      });
    });
    act(() => {
      socket.triggerMessage({
        type: "alert",
        id: "alert-2",
        symbol: "AAPL",
        threshold: 250,
        direction: "above",
        price: 260,
        triggeredAt: "2026-01-01T00:00:01.000Z",
      });
    });

    act(() => result.current.dismissAlert("alert-1"));

    expect(result.current.alertEvents.map((a) => a.id)).toEqual(["alert-2"]);
  });
});
