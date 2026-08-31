import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../lib/ws";
import { parseServerMessage, type AlertEvent } from "../lib/wsMessages";
import type { PriceState } from "../types";

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

const RECONNECT_BASE_MS = 1000;
// The server answers an over-budget message with an error, and counts that
// message against the budget too — so resyncing the instant an error arrives
// sends the very message that keeps us over, and gets another error back.
// Spacing the recovery out breaks that loop while still reconciling.
const ERROR_RESYNC_COOLDOWN_MS = 5000;
const RECONNECT_MAX_MS = 15_000;
const HISTORY_LENGTH = 30;

const MAX_ALERT_EVENTS = 20;

export function useLiveTicks(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceState>>({});
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [wsError, setWsError] = useState<string | null>(null);

  function dismissAlert(id: string) {
    setAlertEvents((prev) => prev.filter((a) => a.id !== id));
  }

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedSymbols = useRef<Set<string>>(new Set());
  const resyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desiredSymbols = useRef<string[]>(symbols);

  // Diffs desiredSymbols against what the socket currently has active and
  // sends only the delta — called both right after connecting and whenever
  // the watchlist changes, so it's the single source of truth for this.
  function syncSubscriptions() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const desired = new Set(desiredSymbols.current);
    const toSubscribe = [...desired].filter((s) => !subscribedSymbols.current.has(s));
    const toUnsubscribe = [...subscribedSymbols.current].filter((s) => !desired.has(s));

    if (toSubscribe.length > 0) {
      ws.send(JSON.stringify({ action: "subscribe", symbols: toSubscribe }));
      for (const s of toSubscribe) subscribedSymbols.current.add(s);
    }
    if (toUnsubscribe.length > 0) {
      ws.send(JSON.stringify({ action: "unsubscribe", symbols: toUnsubscribe }));
      for (const s of toUnsubscribe) {
        subscribedSymbols.current.delete(s);
        setPrices((prev) => {
          const next = { ...prev };
          delete next[s];
          return next;
        });
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setStatus((prev) => (prev === "connecting" ? "connecting" : "reconnecting"));

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        reconnectAttempt.current = 0;
        subscribedSymbols.current = new Set(); // fresh connection, nothing subscribed yet
        setStatus("open");
        syncSubscriptions();
      };

      ws.onmessage = (event) => {
        // Validated rather than cast: a frame with, say, a string price used
        // to flow straight through and blow up later inside a render.
        const msg = parseServerMessage(event.data);
        if (!msg) return;

        if (msg.type === "error") {
          setWsError(msg.message);
          // We don't know which of the just-sent symbols the server
          // actually accepted (the protocol has no per-symbol ack), so the
          // safest recovery is to forget what we think is subscribed and
          // resend the full desired set from scratch, rather than leaving
          // symbols permanently marked "subscribed" when the server never
          // actually accepted them.
          // Forget what we think is subscribed — the server may have
          // rejected the whole batch, and there's no per-symbol ack to tell
          // us which. But reconcile on a timer rather than immediately: an
          // error can be the server asking us to send *less*, and answering
          // it with another message makes that worse.
          subscribedSymbols.current = new Set();
          if (resyncTimer.current === null) {
            resyncTimer.current = setTimeout(() => {
              resyncTimer.current = null;
              syncSubscriptions();
            }, ERROR_RESYNC_COOLDOWN_MS);
          }
          return;
        }

        if (msg.type === "alert") {
          const { type: _type, ...alertEvent } = msg;
          setAlertEvents((prev) => [...prev, alertEvent].slice(-MAX_ALERT_EVENTS));
          return;
        }

        if (msg.type !== "tick") return;

        setPrices((prev) => {
          const existing = prev[msg.symbol];
          const history = [...(existing?.history ?? []), msg.price].slice(-HISTORY_LENGTH);
          return {
            ...prev,
            [msg.symbol]: {
              price: msg.price,
              changePercent: msg.changePercent,
              source: msg.source,
              history,
            },
          };
        });
      };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("reconnecting");
        reconnectAttempt.current += 1;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt.current, RECONNECT_MAX_MS);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (resyncTimer.current) clearTimeout(resyncTimer.current);
      wsRef.current?.close();
      setStatus("closed");
    };
    // Reconnect lifecycle only runs on mount/unmount — symbol changes are
    // pushed over the existing connection via the effect below, not by
    // tearing the socket down and reconnecting. (The effect body only touches
    // refs and stable setters, so no disable directive is needed here.)
  }, []);

  // Keep subscriptions in sync whenever the watchlist itself changes. The
  // desired set is recorded here rather than during render - a render-time ref
  // write can be left behind by a render React discards.
  useEffect(() => {
    desiredSymbols.current = symbols;
    syncSubscriptions();
    // syncSubscriptions only reads refs and stable setters, so it doesn't need
    // to be a dependency; symbols is compared by value via the join.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(",")]);

  return { prices, status, alertEvents, dismissAlert, wsError };
}
