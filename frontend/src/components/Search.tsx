import { useEffect, useState } from "react";
import { MagnifyingGlass, Plus, CircleNotch } from "@phosphor-icons/react";
import { searchTickers, type TickerResult } from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import styles from "./Search.module.css";

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
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <MagnifyingGlass size={18} weight="regular" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
          placeholder="Search tickers (e.g. Apple, AAPL)"
          aria-label="Search for a stock ticker to add to your watchlist"
          aria-expanded={debouncedQuery.length > 0}
          aria-controls="search-results"
          className={styles.input}
        />
        {status === "loading" && (
          <CircleNotch size={16} className={`spin ${styles.spinner}`} aria-hidden />
        )}
      </div>

      {debouncedQuery && (
        <div id="search-results" role="listbox" aria-label="Ticker search results" className={styles.results}>
          {status === "error" && (
            <div className={styles.resultsError}>Couldn't reach search right now. Try again in a moment.</div>
          )}
          {status === "idle" && results.length === 0 && (
            <div className={styles.resultsEmpty}>No matches for "{debouncedQuery}"</div>
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
                className={`${styles.option} ${added ? styles.optionAdded : ""}`}
              >
                <span>
                  <strong className="tabular-nums">{ticker.symbol}</strong>{" "}
                  <span className={styles.optionName}>{ticker.name}</span>
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
