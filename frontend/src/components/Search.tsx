import { useEffect, useState } from "react";
import { MagnifyingGlass, Plus, CircleNotch } from "@phosphor-icons/react";
import { searchTickers, type TickerResult } from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

interface SearchProps {
  onAdd: (ticker: TickerResult) => void;
  alreadyAdded: (symbol: string) => boolean;
}

type Status = "idle" | "loading" | "error";

export default function Search({ onAdd, alreadyAdded }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TickerResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    searchTickers(debouncedQuery)
      .then(({ results }) => {
        if (cancelled) return;
        setResults(results);
        setStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div style={{ position: "relative", width: "min(360px, 100%)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          background: "var(--color-muted)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-2) var(--space-3)",
        }}
      >
        <MagnifyingGlass size={18} weight="regular" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tickers (e.g. Apple, AAPL)"
          aria-label="Search for a stock ticker to add to your watchlist"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            minHeight: "24px",
          }}
        />
        {status === "loading" && (
          <CircleNotch size={16} className="spin" aria-hidden style={{ opacity: 0.6 }} />
        )}
      </div>

      {debouncedQuery && (
        <div
          role="listbox"
          aria-label="Ticker search results"
          style={{
            position: "absolute",
            top: "calc(100% + var(--space-2))",
            left: 0,
            right: 0,
            background: "var(--color-secondary)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            zIndex: 10,
          }}
        >
          {status === "error" && (
            <div style={{ padding: "var(--space-3)", color: "var(--color-bearish)" }}>
              Couldn't reach search right now. Try again in a moment.
            </div>
          )}
          {status === "idle" && results.length === 0 && (
            <div style={{ padding: "var(--space-3)", opacity: 0.7 }}>No matches for "{debouncedQuery}"</div>
          )}
          {results.map((ticker) => {
            const added = alreadyAdded(ticker.symbol);
            return (
              <button
                key={ticker.symbol}
                role="option"
                aria-selected={false}
                disabled={added}
                onClick={() => onAdd(ticker)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-3)",
                  padding: "var(--space-3)",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--color-border)",
                  textAlign: "left",
                  minHeight: "44px",
                  opacity: added ? 0.5 : 1,
                }}
              >
                <span>
                  <strong className="tabular-nums">{ticker.symbol}</strong>{" "}
                  <span style={{ opacity: 0.7 }}>{ticker.name}</span>
                </span>
                <Plus size={18} aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
