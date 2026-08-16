import { TrendDown, TrendUp } from "@phosphor-icons/react";
import TickerAvatar from "./TickerAvatar";
import { formatCurrency, formatSignedPercent } from "../lib/format";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./FavoritesList.module.css";

const MAX_ROWS = 5;

interface FavoritesListProps {
  items: WatchlistItem[];
  prices: Record<string, PriceState>;
  onSelect: (symbol: string) => void;
}

// The compact rail beside the chart in the reference. It's the same watchlist
// as the table below, trimmed to the first few rows - there's only one real
// list of symbols, so this is a shortcut into it rather than a second feed.
export default function FavoritesList({ items, prices, onSelect }: FavoritesListProps) {
  const shown = items.slice(0, MAX_ROWS);

  return (
    <section className={styles.card} aria-labelledby="favorites-title">
      <div className={styles.header}>
        <h2 id="favorites-title" className={styles.title}>
          Watching
        </h2>
        {items.length > MAX_ROWS && (
          <span className={styles.count}>
            {shown.length} of {items.length}
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        <p className={styles.empty}>Nothing here yet — search above to add a ticker.</p>
      ) : (
        <div className={styles.list}>
          {shown.map((item) => {
            const state = prices[item.symbol];
            const up = (state?.changePercent ?? 0) >= 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.symbol)}
                className={styles.row}
                aria-label={`Open ${item.symbol}`}
              >
                <TickerAvatar symbol={item.symbol} size={32} />
                <span className={styles.names}>
                  <span className={styles.symbol}>{item.symbol}</span>
                  <span className={styles.name}>{item.name}</span>
                </span>
                <span className={styles.figures}>
                  <span className={`tabular-nums ${styles.price}`}>
                    {state ? formatCurrency(state.price) : "—"}
                  </span>
                  <span className={`tabular-nums ${styles.change} ${state ? (up ? styles.bullish : styles.bearish) : ""}`}>
                    {state ? (
                      <>
                        {up ? <TrendUp size={13} aria-hidden /> : <TrendDown size={13} aria-hidden />}
                        {formatSignedPercent(state.changePercent)}
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
