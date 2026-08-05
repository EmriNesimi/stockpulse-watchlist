import { useEffect, useMemo, useState } from "react";
import Search from "./components/Search";
import WatchlistTable from "./components/WatchlistTable";
import ConnectionBadge from "./components/ConnectionBadge";
import AlertToast from "./components/AlertToast";
import { useLiveTicks } from "./hooks/useLiveTicks";
import { useThrottledAnnouncement } from "./hooks/useThrottledAnnouncement";
import {
  addToWatchlist,
  createAlert,
  getWatchlist,
  removeFromWatchlist,
  type TickerResult,
  type WatchlistItem,
} from "./lib/api";

export default function App() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const symbols = useMemo(() => items.map((i) => i.symbol), [items]);
  const { prices, status, alertEvents, dismissAlert } = useLiveTicks(symbols);
  const announcement = useThrottledAnnouncement(items, prices);

  useEffect(() => {
    getWatchlist()
      .then(({ items }) => setItems(items))
      .catch(() => {
        /* error state lands with a future toast/error-banner pass */
      });
  }, []);

  async function handleAdd(ticker: TickerResult) {
    try {
      const { item } = await addToWatchlist(ticker.symbol, ticker.name);
      setItems((prev) => [...prev, item]);
    } catch {
      // surfaced properly once there's a toast/error UI for this path too
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

  async function handleCreateAlert(symbol: string, threshold: number, direction: "above" | "below") {
    try {
      await createAlert(symbol, threshold, direction);
    } catch {
      // the alert just silently didn't get created — a toast for this
      // specific failure path is a reasonable follow-up, not done yet
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
      <a href="#main-content" className="skip-link">
        Skip to watchlist
      </a>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <AlertToast alerts={alertEvents} onDismiss={dismissAlert} />

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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span style={{ fontWeight: 600, fontSize: "1.125rem", letterSpacing: "-0.01em" }}>
            StockPulse
          </span>
          <ConnectionBadge status={status} />
        </div>
        <Search onAdd={handleAdd} alreadyAdded={(symbol) => items.some((i) => i.symbol === symbol)} />
      </header>

      <main id="main-content" tabIndex={-1} style={{ flex: 1, padding: "var(--space-5)" }}>
        <WatchlistTable
          items={items}
          prices={prices}
          onRemove={handleRemove}
          onCreateAlert={handleCreateAlert}
        />
      </main>
    </div>
  );
}
