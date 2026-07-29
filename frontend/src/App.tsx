import { useEffect, useState } from "react";
import Search from "./components/Search";
import { addToWatchlist, getWatchlist, type TickerResult, type WatchlistItem } from "./lib/api";

export default function App() {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    getWatchlist()
      .then(({ items }) => setItems(items))
      .catch(() => {
        /* real error handling/empty-state UI lands with the watchlist table */
      });
  }, []);

  async function handleAdd(ticker: TickerResult) {
    try {
      const { item } = await addToWatchlist(ticker.symbol, ticker.name);
      setItems((prev) => [...prev, item]);
    } catch {
      // surfaced properly once the watchlist table/toast UI is in place
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
        {items.length === 0 ? (
          <p style={{ opacity: 0.7 }}>
            Nothing on your watchlist yet — search above to add a ticker.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((item) => (
              <li key={item.id} style={{ padding: "var(--space-2) 0" }}>
                <strong className="tabular-nums">{item.symbol}</strong>{" "}
                <span style={{ opacity: 0.7 }}>{item.name}</span>
              </li>
            ))}
          </ul>
        )}
        <p style={{ opacity: 0.5, fontSize: "0.875rem", marginTop: "var(--space-5)" }}>
          Live prices, sparklines, and remove buttons land in the next commit.
        </p>
      </main>
    </div>
  );
}
