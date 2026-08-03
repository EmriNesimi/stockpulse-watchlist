import { createServer, type Server as HttpServer } from "node:http";
import { WebSocket } from "ws";
import type { PriceFeed, PriceTick, Unsubscribe } from "../priceFeed";
import { attachBroadcaster } from "./broadcaster";

/** In-memory stand-in for a real PriceFeed — lets tests trigger ticks by hand and inspect what got subscribed. */
export class FakePriceFeed implements PriceFeed {
  subscribeCalls: string[] = [];
  private subscribers = new Map<string, Set<(tick: PriceTick) => void>>();

  subscribe(symbol: string, onTick: (tick: PriceTick) => void): Unsubscribe {
    this.subscribeCalls.push(symbol);
    let subs = this.subscribers.get(symbol);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(symbol, subs);
    }
    subs.add(onTick);

    return () => {
      subs!.delete(onTick);
      if (subs!.size === 0) this.subscribers.delete(symbol);
    };
  }

  /** Which symbols currently have at least one active upstream subscriber. */
  activeSymbols(): string[] {
    return [...this.subscribers.keys()];
  }

  emit(symbol: string, tick: PriceTick) {
    for (const onTick of this.subscribers.get(symbol) ?? []) onTick(tick);
  }
}

export function fakeTick(symbol: string, overrides: Partial<PriceTick> = {}): PriceTick {
  return {
    symbol,
    price: 100,
    changePercent: 0,
    timestamp: Date.now(),
    source: "simulated",
    ...overrides,
  };
}

export async function startTestServer(priceFeed: PriceFeed): Promise<{ server: HttpServer; port: number }> {
  const server = createServer();
  attachBroadcaster(server, priceFeed);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port };
}

export function connectClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

/** Buffers incoming JSON messages and lets tests await the next one, in order. */
export class MessageCollector {
  messages: unknown[] = [];
  private waiters: Array<(msg: unknown) => void> = [];

  constructor(ws: WebSocket) {
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      const waiter = this.waiters.shift();
      if (waiter) waiter(msg);
      else this.messages.push(msg);
    });
  }

  next(timeoutMs = 2000): Promise<unknown> {
    if (this.messages.length > 0) return Promise.resolve(this.messages.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timed out waiting for a WS message")), timeoutMs);
      this.waiters.push((msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
    });
  }
}

/** Small real delay for "nothing arrived" assertions — these tests use a real server/socket, not fake timers. */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Closes a client socket and waits for its own "close" event, rather than
 * guessing a fixed delay is long enough for the close handshake to finish —
 * a blind `wait(50)` after `ws.close()` was flaky under load since the
 * server-side "close" handler (which does the actual cleanup) fires around
 * the same time but isn't guaranteed to land within an arbitrary timeout.
 * Still pairs with a tiny buffer afterward for that server-side handler to run.
 */
export async function closeAndSettle(ws: WebSocket): Promise<void> {
  await new Promise<void>((resolve) => {
    ws.once("close", () => resolve());
    ws.close();
  });
  await wait(20);
}
