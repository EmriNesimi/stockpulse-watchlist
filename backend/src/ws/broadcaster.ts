import type { Server as HttpServer } from "http";
import { parse as parseCookies } from "cookie";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import type { PriceFeed, PriceTick, Unsubscribe } from "../priceFeed";
import { checkAndTriggerAlerts, type AlertTrigger } from "../alerts/checkAndTriggerAlerts";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "../auth/session";

const MAX_SYMBOLS_PER_CLIENT = 30;
const MAX_MESSAGES_PER_MINUTE = 60;
const MAX_PAYLOAD_BYTES = 2 * 1024; // subscribe messages are tiny, no reason to allow more

const clientMessageSchema = z.object({
  action: z.enum(["subscribe", "unsubscribe"]),
  symbols: z.array(z.string().trim().toUpperCase().min(1).max(10)).min(1).max(MAX_SYMBOLS_PER_CLIENT),
});

interface SymbolFanout {
  unsub: Unsubscribe;
  clients: Set<WebSocket>;
}

interface ClientState {
  symbols: Set<string>;
  messageCount: number;
  windowStart: number;
  // Ticks are public market data - connecting doesn't require a session.
  // Price alerts aren't, though: this is undefined for an unauthenticated
  // connection, and such a connection just never receives alert messages
  // (see broadcastAlert). The WS upgrade request sits outside the Express
  // middleware chain entirely, so the cookie has to be parsed by hand here
  // rather than reusing attachUserId.
  userId: string | undefined;
}

function resolveUserId(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = parseCookies(cookieHeader);
  return verifySessionCookieValue(cookies[SESSION_COOKIE_NAME]) ?? undefined;
}

export function attachBroadcaster(server: HttpServer, priceFeed: PriceFeed) {
  const wss = new WebSocketServer({ server, path: "/ws", maxPayload: MAX_PAYLOAD_BYTES });

  // One upstream priceFeed subscription per symbol, shared across every
  // client watching it, instead of one per client-symbol pair.
  const fanouts = new Map<string, SymbolFanout>();
  const clientStates = new WeakMap<WebSocket, ClientState>();

  function getOrCreateFanout(symbol: string): SymbolFanout {
    let fanout = fanouts.get(symbol);
    if (fanout) return fanout;

    const clients = new Set<WebSocket>();
    const unsub = priceFeed.subscribe(symbol, (tick: PriceTick) => {
      broadcast(clients, tick);
      // Fire-and-forget: alert evaluation shouldn't block tick delivery, and
      // a failure here (e.g. a db hiccup) shouldn't take the price feed down.
      checkAndTriggerAlerts(tick)
        .then((triggered) => {
          for (const alert of triggered) broadcastAlert(clients, alert);
        })
        .catch((err) => console.error(`Failed to check price alerts for ${symbol}:`, err));
    });
    fanout = { unsub, clients };
    fanouts.set(symbol, fanout);
    return fanout;
  }

  function broadcast(clients: Set<WebSocket>, tick: PriceTick) {
    const payload = JSON.stringify({ type: "tick", ...tick });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  function broadcastAlert(clients: Set<WebSocket>, alert: AlertTrigger) {
    // userId isn't part of the wire format - it's only here to decide who
    // gets this message, not something the frontend needs.
    const { userId, ...alertPayload } = alert;
    const payload = JSON.stringify({ type: "alert", ...alertPayload });
    for (const client of clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (clientStates.get(client)?.userId !== userId) continue;
      client.send(payload);
    }
  }

  function subscribeClientTo(ws: WebSocket, state: ClientState, symbol: string) {
    if (state.symbols.has(symbol)) return;
    if (state.symbols.size >= MAX_SYMBOLS_PER_CLIENT) {
      ws.send(JSON.stringify({ type: "error", message: `Max ${MAX_SYMBOLS_PER_CLIENT} symbols per connection` }));
      return;
    }
    state.symbols.add(symbol);
    getOrCreateFanout(symbol).clients.add(ws);
  }

  function unsubscribeClientFrom(ws: WebSocket, state: ClientState, symbol: string) {
    if (!state.symbols.delete(symbol)) return;
    const fanout = fanouts.get(symbol);
    if (!fanout) return;
    fanout.clients.delete(ws);
    if (fanout.clients.size === 0) {
      fanout.unsub();
      fanouts.delete(symbol);
    }
  }

  function cleanupClient(ws: WebSocket, state: ClientState) {
    for (const symbol of [...state.symbols]) unsubscribeClientFrom(ws, state, symbol);
  }

  wss.on("connection", (ws, req) => {
    const state: ClientState = {
      symbols: new Set(),
      messageCount: 0,
      windowStart: Date.now(),
      userId: resolveUserId(req.headers.cookie),
    };
    clientStates.set(ws, state);

    ws.on("message", (raw) => {
      // crude per-connection rate limit — resets every 60s
      const now = Date.now();
      if (now - state.windowStart > 60_000) {
        state.windowStart = now;
        state.messageCount = 0;
      }
      state.messageCount += 1;
      if (state.messageCount > MAX_MESSAGES_PER_MINUTE) {
        ws.send(JSON.stringify({ type: "error", message: "Too many messages, slow down" }));
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Malformed JSON" }));
        return;
      }

      const result = clientMessageSchema.safeParse(parsed);
      if (!result.success) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid subscribe/unsubscribe message" }));
        return;
      }

      const { action, symbols } = result.data;
      for (const symbol of symbols) {
        if (action === "subscribe") subscribeClientTo(ws, state, symbol);
        else unsubscribeClientFrom(ws, state, symbol);
      }
    });

    ws.on("close", () => cleanupClient(ws, state));
    ws.on("error", () => cleanupClient(ws, state));
  });

  return wss;
}
