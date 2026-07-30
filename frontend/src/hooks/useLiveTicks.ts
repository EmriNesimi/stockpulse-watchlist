import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../lib/ws";
import type { PriceState } from "../types";

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15_000;
const HISTORY_LENGTH = 30;

interface TickMessage {
  type: "tick";
  symbol: string;
  price: number;
  changePercent: number;
  source: "live" | "simulated";
}

export function useLiveTicks(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceState>>({});
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedSymbols = useRef<Set<string>>(new Set());
  const desiredSymbols = useRef<string[]>(symbols);
  desiredSymbols.current = symbols;

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
        let msg: TickMessage;
        try {
          msg = JSON.parse(event.data);
        } catch {
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
      wsRef.current?.close();
      setStatus("closed");
    };
    // Reconnect lifecycle only runs on mount/unmount — symbol changes are
    // pushed over the existing connection via the effect below, not by
    // tearing the socket down and reconnecting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep subscriptions in sync whenever the watchlist itself changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(syncSubscriptions, [symbols.join(",")]);

  return { prices, status };
}
