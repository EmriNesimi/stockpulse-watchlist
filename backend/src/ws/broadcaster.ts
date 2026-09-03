import type { IncomingMessage, Server as HttpServer } from "http";
import { parse as parseCookies } from "cookie";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import type { PriceFeed, PriceTick, Unsubscribe } from "../priceFeed";
import { checkAndTriggerAlerts, type AlertTrigger } from "../alerts/checkAndTriggerAlerts";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "../auth/session";
import { env } from "../env";
import { prisma } from "../db";
import { MAX_SYMBOLS_PER_CLIENT } from "../wsLimits";
import { symbolSchema } from "../routes/watchlist.schemas";

const MAX_MESSAGES_PER_MINUTE = 60;
const MAX_PAYLOAD_BYTES = 2 * 1024; // subscribe messages are tiny, no reason to allow more
// One browser tab opens one connection. The allowance is for a few tabs plus
// reconnects that haven't been reaped yet, not for a client opening dozens.
export const MAX_CONNECTIONS_PER_IP = 8;

// The upgrade request never touches the Express middleware chain, so req.ip
// doesn't exist here and the header has to be read by hand. app.ts sets
// "trust proxy" to 1, meaning exactly one hop is trusted, so the rightmost
// entry — the one our trusted proxy wrote — is the client. Earlier entries
// are attacker-controlled and must not be trusted, which is the whole reason
// this doesn't just take the first one.
export function clientIpFrom(headers: Record<string, unknown>, remoteAddress: string | undefined): string {
  const forwarded = headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded.join(",") : typeof forwarded === "string" ? forwarded : "";
  const hops = raw
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  return hops[hops.length - 1] ?? remoteAddress ?? "unknown";
}

const clientMessageSchema = z.object({
  action: z.enum(["subscribe", "unsubscribe"]),
  // Same ticker regex the REST routes use. This used to be a loose 1-10 char
  // string, so punctuation could ride through and get interpolated into an
  // outbound Massive URL — bounded by the global quota, but no reason for the
  // socket to validate more weakly than the routes.
  symbols: z.array(symbolSchema).min(1).max(MAX_SYMBOLS_PER_CLIENT),
});

interface SymbolFanout {
  unsub: Unsubscribe;
  clients: Set<WebSocket>;
}

interface ClientState {
  symbols: Set<string>;
  ip: string;
  // Ticks are public market data - connecting doesn't require a session.
  // Price alerts aren't, though: this is undefined for an unauthenticated
  // connection, and such a connection just never receives alert messages
  // (see broadcastAlert). The WS upgrade request sits outside the Express
  // middleware chain entirely, so the cookie has to be parsed by hand here
  // rather than reusing attachUserId.
  userId: string | undefined;
}

// Async because the epoch has to be checked against the database, same as the
// HTTP middleware. Without it a revoked session kept receiving that user's
// private alerts here — the upgrade sits outside the Express chain, so it
// doesn't inherit the check automatically.
async function resolveUserId(cookieHeader: string | undefined): Promise<string | undefined> {
  if (!cookieHeader) return undefined;

  const session = verifySessionCookieValue(parseCookies(cookieHeader)[SESSION_COOKIE_NAME]);
  if (!session) return undefined;

  const user = await prisma.user
    .findUnique({ where: { id: session.userId }, select: { sessionEpoch: true } })
    .catch(() => null);

  if (!user || user.sessionEpoch !== session.epoch) return undefined;
  return session.userId;
}

// The same-origin policy doesn't cover WebSockets and CORS never runs on an
// upgrade request, so without this check any page on the internet could open
// a socket to this server, have the browser attach the user's session cookie,
// and receive that user's private alert messages (cross-site WebSocket
// hijacking). Browsers always send Origin on a WS handshake; non-browser
// clients (tests, curl) send none and are allowed through, since there's no
// ambient cookie to abuse in that case.
export function isAllowedOrigin(origin: string | undefined, allowed: string): boolean {
  if (origin === undefined) return true;
  return origin === allowed;
}

export function attachBroadcaster(server: HttpServer, priceFeed: PriceFeed) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: MAX_PAYLOAD_BYTES,
    verifyClient: ({ origin, req }, done) => {
      if (!isAllowedOrigin(origin, env.frontendOrigin)) return done(false, 403, "Forbidden origin");

      // Rejected at the upgrade, before a socket exists: without this an
      // attacker could open unlimited connections and, since each one used to
      // carry its own message budget, multiply their throughput at will.
      const ip = clientIpFrom(req.headers, req.socket.remoteAddress);
      if ((connectionsPerIp.get(ip) ?? 0) >= MAX_CONNECTIONS_PER_IP) {
        return done(false, 429, "Too many connections");
      }

      // Resolved here rather than in the connection handler so the answer is
      // already known by the time the socket is live. Doing it afterwards
      // left a window where a tick could fire before we knew who the client
      // was, and they'd silently miss their own alert.
      void resolveUserId(req.headers.cookie).then((userId) => {
        resolvedUsers.set(req, userId);
        done(true);
      });
    },
  });

  // One upstream priceFeed subscription per symbol, shared across every
  // client watching it, instead of one per client-symbol pair.
  const fanouts = new Map<string, SymbolFanout>();
  const clientStates = new WeakMap<WebSocket, ClientState>();

  // Keyed by IP rather than by connection. The budget used to live on
  // ClientState, which is rebuilt on every connection — so a client that hit
  // the cap could simply reconnect and get a fresh 60, making the limit
  // decorative. Surviving the reconnect is the entire point of this map.
  // Bridges verifyClient to the connection handler: keyed by the upgrade
  // request, which is the same object in both. WeakMap so an upgrade that is
  // rejected after resolving doesn't leak.
  const resolvedUsers = new WeakMap<IncomingMessage, string | undefined>();

  const messageBudgets = new Map<string, { count: number; windowStart: number }>();
  const connectionsPerIp = new Map<string, number>();

  // Both maps are keyed by attacker-suppliable IPs, so they need pruning or
  // they grow without bound. An entry is only droppable once nobody is
  // connected from it and its window has lapsed.
  function pruneIdleBudgets(now: number) {
    for (const [ip, budget] of messageBudgets) {
      if ((connectionsPerIp.get(ip) ?? 0) === 0 && now - budget.windowStart > 60_000) {
        messageBudgets.delete(ip);
      }
    }
  }

  function overMessageBudget(ip: string): boolean {
    const now = Date.now();
    const budget = messageBudgets.get(ip);

    if (!budget || now - budget.windowStart > 60_000) {
      messageBudgets.set(ip, { count: 1, windowStart: now });
      return false;
    }

    budget.count += 1;
    return budget.count > MAX_MESSAGES_PER_MINUTE;
  }

  function getOrCreateFanout(symbol: string): SymbolFanout {
    let fanout = fanouts.get(symbol);
    if (fanout) return fanout;

    const clients = new Set<WebSocket>();
    const unsub = priceFeed.subscribe(symbol, (tick: PriceTick) => {
      broadcast(clients, tick);
      // Fire-and-forget: alert evaluation shouldn't block tick delivery, and
      // a failure here (e.g. a db hiccup) shouldn't take the price feed down.
      // Broadcast per alert as it's claimed rather than after the batch: a
      // failure partway through used to reject before any of them were sent,
      // even though the earlier ones were already durably marked triggered
      // and could never fire again.
      checkAndTriggerAlerts(tick, (alert) => broadcastAlert(clients, alert)).catch((err) =>
        console.error(`Failed to check price alerts for ${symbol}:`, err)
      );
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
    const ip = clientIpFrom(req.headers, req.socket.remoteAddress);
    connectionsPerIp.set(ip, (connectionsPerIp.get(ip) ?? 0) + 1);
    pruneIdleBudgets(Date.now());

    // Starts undefined and is filled in once the lookup returns. Alerts are
    // only ever delivered to a matching userId, so the gap before it resolves
    // means a client might miss an alert fired in those milliseconds — never
    // that someone receives one they shouldn't. Failing closed is the right
    // way round for private messages.
    const state: ClientState = {
      symbols: new Set(),
      ip,
      userId: resolvedUsers.get(req),
    };
    resolvedUsers.delete(req);
    clientStates.set(ws, state);

    ws.on("message", (raw) => {
      // Budget is per IP and outlives this connection, so dropping and
      // reconnecting no longer buys a fresh allowance.
      if (overMessageBudget(state.ip)) {
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

    // Only the slot is released here, never the message budget — freeing that
    // on disconnect would hand back the fresh allowance this is preventing.
    // ws emits "error" and then "close" for the same socket, and releasing
    // twice would under-count the IP and quietly widen the cap.
    let released = false;
    function releaseConnection() {
      if (released) return;
      released = true;

      const remaining = (connectionsPerIp.get(ip) ?? 1) - 1;
      if (remaining > 0) connectionsPerIp.set(ip, remaining);
      else connectionsPerIp.delete(ip);
    }

    ws.on("close", () => {
      cleanupClient(ws, state);
      releaseConnection();
    });
    ws.on("error", () => {
      cleanupClient(ws, state);
      releaseConnection();
    });
  });

  return wss;
}
