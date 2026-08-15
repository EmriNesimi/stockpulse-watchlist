import { ChartLineUp, TrendDown, TrendUp } from "@phosphor-icons/react";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./StatsRow.module.css";

interface StatsRowProps {
  items: WatchlistItem[];
  prices: Record<string, PriceState>;
}

// Every number here comes straight from the watchlist/prices already in
// memory - no invented "portfolio value" or fake holdings data, since this
// app tracks tickers, not actual positions.
export default function StatsRow({ items, prices }: StatsRowProps) {
  if (items.length === 0) return null;

  const changes = items.map((item) => prices[item.symbol]?.changePercent).filter((c): c is number => c !== undefined);
  const gainers = changes.filter((c) => c >= 0).length;
  const losers = changes.filter((c) => c < 0).length;
  const avgChange = changes.length > 0 ? changes.reduce((sum, c) => sum + c, 0) / changes.length : null;

  return (
    <div className={styles.row}>
      <div className={styles.card}>
        <span className={styles.label}>
          <ChartLineUp size={16} aria-hidden />
          Tracking
        </span>
        <span className={styles.value}>{items.length}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>
          <TrendUp size={16} aria-hidden />
          Gainers
        </span>
        <span className={`${styles.value} ${styles.bullish}`}>{gainers}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>
          <TrendDown size={16} aria-hidden />
          Losers
        </span>
        <span className={`${styles.value} ${styles.bearish}`}>{losers}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>Avg. change</span>
        <span
          className={`${styles.value} tabular-nums ${
            avgChange === null ? "" : avgChange >= 0 ? styles.bullish : styles.bearish
          }`}
        >
          {avgChange === null ? "—" : `${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%`}
        </span>
      </div>
    </div>
  );
}
