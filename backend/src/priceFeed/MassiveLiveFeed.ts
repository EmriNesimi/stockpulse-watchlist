import WebSocket from "ws";
import { env } from "../env";
import type { PriceFeed, PriceTick, Unsubscribe } from "./PriceFeed";
import { SimulatedFeed } from "./SimulatedFeed";
import { fetchPreviousClose } from "./previousClose";

const MASSIVE_WS_URL = "wss://socket.massive.com/stocks";
const AUTH_TIMEOUT_MS = 6000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

type AuthState = "connecting" | "authenticated" | "failed";

interface MassiveEvent {
  ev: string;
  status?: string;
  sym?: string;
  p?: number; // trade price
}

interface SubscriptionRecord {
  symbol: string;
  onTick: (tick: PriceTick) => void;
  mode: "live" | "fallback";
  fallbackUnsub?: Unsubscribe;
}

/**
 * Wraps Massive's real-time stocks WebSocket (Massive is the market-data
 * provider formerly branded Polygon.io — same account/API, renamed Oct
 * 2025). Free-tier keys don't get real-time US stock trades (that needs a
 * paid plan), so if auth fails, times out, or Massive sends back an error
 * status, this quietly moves every subscriber over to a SimulatedFeed
 * instead of taking the app down. Callers never need to know which one is
 * actually serving their subscription.
 */
export class MassiveLiveFeed implements PriceFeed {
  private ws: WebSocket | null = null;
  private authState: AuthState = "connecting";
  private authTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private baseCloses = new Map<string, number>();

  // symbol -> live subscription records currently riding the real WS
  private live = new Map<string, Set<SubscriptionRecord>>();
  private fallback = new SimulatedFeed();

  constructor() {
    this.connect();
  }

  subscribe(symbol: string, onTick: (tick: PriceTick) => void): Unsubscribe {
    if (this.authState === "failed") {
      const record: SubscriptionRecord = { symbol, onTick, mode: "fallback" };
      record.fallbackUnsub = this.fallback.subscribe(symbol, onTick);
      return () => record.fallbackUnsub?.();
    }

    const record: SubscriptionRecord = { symbol, onTick, mode: "live" };
    let subs = this.live.get(symbol);
    if (!subs) {
      subs = new Set();
      this.live.set(symbol, subs);
      fetchPreviousClose(symbol).then((close) => {
        if (close && close > 0) this.baseCloses.set(symbol, close);
      });
      if (this.authState === "authenticated") this.sendSubscribe(symbol);
    }
    subs.add(record);

    return () => {
      if (record.mode === "fallback") {
        record.fallbackUnsub?.();
        return;
      }
      const current = this.live.get(symbol);
      if (!current) return;
      current.delete(record);
      if (current.size === 0) {
        this.live.delete(symbol);
        this.baseCloses.delete(symbol);
        if (this.authState === "authenticated") this.sendUnsubscribe(symbol);
      }
    };
  }

  private connect() {
    this.authState = "connecting";
    this.ws = new WebSocket(MASSIVE_WS_URL);

    this.authTimer = setTimeout(() => {
      console.warn("Massive WS auth timed out — falling back to simulated feed.");
      this.failOver();
    }, AUTH_TIMEOUT_MS);

    this.ws.on("open", () => {
      this.ws?.send(JSON.stringify({ action: "auth", params: env.massiveApiKey }));
    });

    this.ws.on("message", (raw) => this.handleMessage(raw.toString()));

    this.ws.on("error", (err) => {
      console.error("Massive WS error:", err.message);
    });

    this.ws.on("close", () => {
      if (this.authState === "failed") return; // already on fallback, no point reconnecting
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    this.reconnectAttempt += 1;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS);
    setTimeout(() => this.connect(), delay);
  }

  /** Permanently moves every current and future subscriber onto the simulated feed. */
  private failOver() {
    if (this.authTimer) clearTimeout(this.authTimer);
    this.authState = "failed";
    this.ws?.close();

    for (const subs of this.live.values()) {
      for (const record of subs) {
        record.mode = "fallback";
        record.fallbackUnsub = this.fallback.subscribe(record.symbol, record.onTick);
      }
    }
    this.live.clear();
    this.baseCloses.clear();
  }

  private sendSubscribe(symbol: string) {
    this.ws?.send(JSON.stringify({ action: "subscribe", params: `T.${symbol}` }));
  }

  private sendUnsubscribe(symbol: string) {
    this.ws?.send(JSON.stringify({ action: "unsubscribe", params: `T.${symbol}` }));
  }

  private handleMessage(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    // Massive batches events into an array, but a frame that parses to
    // anything else would make the loop below throw inside a "message"
    // listener - nothing catches that, so it would take the process down.
    // Drop the frame instead.
    if (!Array.isArray(parsed)) return;
    const events = parsed as MassiveEvent[];

    for (const event of events) {
      if (event.ev === "status") {
        this.handleStatus(event);
        continue;
      }
      if (event.ev === "T" && event.sym && typeof event.p === "number") {
        this.handleTrade(event.sym, event.p);
      }
    }
  }

  private handleStatus(event: MassiveEvent) {
    if (event.status === "auth_success") {
      if (this.authTimer) clearTimeout(this.authTimer);
      this.authState = "authenticated";
      this.reconnectAttempt = 0;
      for (const symbol of this.live.keys()) this.sendSubscribe(symbol);
    } else if (event.status === "auth_failed" || event.status === "max_connections") {
      console.warn(`Massive WS ${event.status} — falling back to simulated feed.`);
      this.failOver();
    } else if (event.status === "error") {
      // Typically "not entitled" for free-tier keys on the real-time stocks cluster.
      console.warn("Massive WS reported an error, falling back to simulated feed:", event);
      this.failOver();
    }
  }

  private handleTrade(symbol: string, price: number) {
    const subs = this.live.get(symbol);
    if (!subs || subs.size === 0) return;

    const basePrice = this.baseCloses.get(symbol) ?? price;
    const changePercent = ((price - basePrice) / basePrice) * 100;

    const tick: PriceTick = {
      symbol,
      price: Math.round(price * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: Date.now(),
      source: "live",
    };

    for (const record of subs) record.onTick(tick);
  }
}
