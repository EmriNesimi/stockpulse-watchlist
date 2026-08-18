import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Never make a real network call for the previous-close seed in these tests.
vi.mock("./previousClose", () => ({
  fetchPreviousClose: vi.fn().mockResolvedValue(null),
}));

type Handler = (...args: unknown[]) => void;

// vi.mock's factory is hoisted above all imports (and above any other
// top-level code in this file) by Vitest, so it can't close over a plain
// top-level `class FakeWebSocket` declared further down — that class
// wouldn't exist yet when the factory runs. vi.hoisted() is Vitest's
// escape hatch for exactly this: it hoists the value itself right along
// with the mock.
const { FakeWebSocket } = vi.hoisted(() => {
  /** Minimal stand-in for `ws`'s WebSocket — enough of the `.on`/`.send`/`.close` surface for MassiveLiveFeed. */
  class FakeWebSocket {
    static instances: FakeWebSocket[] = [];
    sent: string[] = [];
    closed = false;
    private handlers: Record<string, Handler[]> = {};

    constructor(public url: string) {
      FakeWebSocket.instances.push(this);
    }

    on(event: string, handler: Handler) {
      (this.handlers[event] ??= []).push(handler);
      return this;
    }

    send(data: string) {
      this.sent.push(data);
    }

    close() {
      this.closed = true;
    }

    /** Test helper: fire a registered event handler as if the socket emitted it. */
    emit(event: string, ...args: unknown[]) {
      for (const handler of this.handlers[event] ?? []) handler(...args);
    }

    emitStatus(status: string) {
      this.emit("message", JSON.stringify([{ ev: "status", status }]));
    }

    emitTrade(sym: string, price: number) {
      this.emit("message", JSON.stringify([{ ev: "T", sym, p: price }]));
    }
  }

  return { FakeWebSocket };
});

vi.mock("ws", () => ({ default: FakeWebSocket }));

import { MassiveLiveFeed } from "./MassiveLiveFeed";

function latestSocket(): InstanceType<typeof FakeWebSocket> {
  const socket = FakeWebSocket.instances.at(-1);
  if (!socket) throw new Error("no FakeWebSocket instance was constructed");
  return socket;
}

describe("MassiveLiveFeed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("sends an auth message once the socket opens", () => {
    new MassiveLiveFeed();
    const socket = latestSocket();
    socket.emit("open");

    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toMatchObject({ action: "auth" });
  });

  it("delivers real trades as live ticks once authenticated", () => {
    const feed = new MassiveLiveFeed();
    const socket = latestSocket();
    socket.emit("open");
    socket.emitStatus("auth_success");

    const onTick = vi.fn();
    feed.subscribe("AAPL", onTick);
    socket.emitTrade("AAPL", 231.5);

    expect(onTick).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "AAPL", price: 231.5, source: "live" })
    );
  });

  it("sends a subscribe frame for a symbol once authenticated", () => {
    const feed = new MassiveLiveFeed();
    const socket = latestSocket();
    socket.emit("open");
    socket.emitStatus("auth_success");
    socket.sent = []; // clear the auth frame, only care about what happens next

    feed.subscribe("MSFT", vi.fn());

    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toEqual({ action: "subscribe", params: "T.MSFT" });
  });

  it("falls back to simulated ticks when Massive reports auth_failed", () => {
    const feed = new MassiveLiveFeed();
    const socket = latestSocket();
    socket.emit("open");

    const onTick = vi.fn();
    feed.subscribe("AAPL", onTick); // subscribed while still "connecting"

    socket.emitStatus("auth_failed");
    expect(socket.closed).toBe(true);

    vi.advanceTimersByTime(1500); // SimulatedFeed's tick interval
    expect(onTick).toHaveBeenCalledWith(expect.objectContaining({ source: "simulated" }));
  });

  it("falls back to simulated ticks when Massive reports an entitlement error", () => {
    const feed = new MassiveLiveFeed();
    const socket = latestSocket();
    socket.emit("open");
    socket.emitStatus("auth_success");

    const onTick = vi.fn();
    feed.subscribe("AAPL", onTick);
    socket.emitStatus("error"); // e.g. free-tier key, not entitled to real-time trades

    vi.advanceTimersByTime(1500);
    expect(onTick).toHaveBeenCalledWith(expect.objectContaining({ source: "simulated" }));
  });

  it("falls back to simulated ticks if auth never resolves in time", () => {
    const feed = new MassiveLiveFeed();
    latestSocket().emit("open"); // never sends back a status at all

    const onTick = vi.fn();
    feed.subscribe("AAPL", onTick);

    vi.advanceTimersByTime(6000); // AUTH_TIMEOUT_MS
    vi.advanceTimersByTime(1500); // let the now-active SimulatedFeed tick

    expect(onTick).toHaveBeenCalledWith(expect.objectContaining({ source: "simulated" }));
  });

  it("reconnects with backoff if the socket drops before auth failed", () => {
    new MassiveLiveFeed();
    latestSocket().emit("open");
    latestSocket().emit("close"); // connection dropped, not an auth failure

    expect(FakeWebSocket.instances).toHaveLength(1); // no reconnect yet
    vi.advanceTimersByTime(2000); // base backoff for the first attempt
    expect(FakeWebSocket.instances).toHaveLength(2); // reconnected
  });

  it("does not reconnect after a permanent auth failure", () => {
    new MassiveLiveFeed();
    const socket = latestSocket();
    socket.emit("open");
    socket.emitStatus("auth_failed");
    socket.emit("close"); // ws library still fires close after we call .close() ourselves

    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1); // never reconnects once failed over
  });

  it("drops a frame that parses to something other than an array", () => {
    new MassiveLiveFeed();
    const socket = latestSocket();
    socket.emit("open");

    // Some WS APIs send a single object rather than a batch. That used to hit
    // a for..of over a non-iterable inside the "message" listener, which
    // nothing catches - it would take the process down instead of skipping
    // the frame.
    expect(() => socket.emit("message", JSON.stringify({ ev: "T", sym: "AAPL", p: 1 }))).not.toThrow();
    expect(() => socket.emit("message", "null")).not.toThrow();
    expect(() => socket.emit("message", "42")).not.toThrow();
    expect(() => socket.emit("message", '"a string"')).not.toThrow();
  });
});
