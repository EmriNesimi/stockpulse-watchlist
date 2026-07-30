import { useEffect, useState } from "react";
import Search from "./components/Search";
import WatchlistTable from "./components/WatchlistTable";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  type TickerResult,
  type WatchlistItem,
} from "./lib/api";
import type { PriceState } from "./types";

export default function App() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  // Populated by the WebSocket client hook once that lands (next commit) —
  // stays empty for now, table just renders "—" placeholders.
  const [prices] = useState<Record<string, PriceState>>({});

  useEffect(() => {
    getWatchlist()
      .then(({ items }) => setItems(items))
      .catch(() => {
        /* error state lands with the WS/live-data commit */
      });
  }, []);

  async function handleAdd(ticker: TickerResult) {
    try {
      const { item } = await addToWatchlist(ticker.symbol, ticker.name);
      setItems((prev) => [...prev, item]);
    } catch {
      // surfaced properly once there's a toast/error UI
    }
  }

  async function handleRemove(symbol: string) {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.symbol !== symbol)); // optimistic
    try {
      await removeFromWatchlist(symbol);
    } catch {
      setItems(previous); // roll back if the backend rejected it
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          padding: "var(--space-3) var(--space-5)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-primary)",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "1.125rem", letterSpacing: "-0.01em" }}>
          StockPulse
        </span>
        <Search onAdd={handleAdd} alreadyAdded={(symbol) => items.some((i) => i.symbol === symbol)} />
      </header>

      <main style={{ flex: 1, padding: "var(--space-5)" }}>
        <WatchlistTable items={items} prices={prices} onRemove={handleRemove} />
      </main>
    </div>
  );
}
