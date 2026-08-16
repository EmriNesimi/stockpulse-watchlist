import { Fragment, useState } from "react";
import { TrendUp, TrendDown, X, Bell } from "@phosphor-icons/react";
import Sparkline from "./Sparkline";
import PriceCell from "./PriceCell";
import AlertForm from "./AlertForm";
import TickerAvatar from "./TickerAvatar";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./WatchlistTable.module.css";

const COLUMN_COUNT = 6;

interface WatchlistTableProps {
  items: WatchlistItem[];
  prices: Record<string, PriceState>;
  loading?: boolean;
  onRemove: (symbol: string) => void;
  onCreateAlert: (symbol: string, threshold: number, direction: "above" | "below") => void;
  onSelectSymbol: (symbol: string) => void;
}

// The rolling tick history each row already tracks (for the sparkline) also
// gives us a real intraday-session range for free - no extra API call, and
// no invented 52-week-high/low we don't actually have data for.
function sessionRange(history: number[] | undefined): string {
  if (!history || history.length < 2) return "—";
  const low = Math.min(...history);
  const high = Math.max(...history);
  return `$${low.toFixed(2)} – $${high.toFixed(2)}`;
}

export default function WatchlistTable({
  items,
  prices,
  loading = false,
  onRemove,
  onCreateAlert,
  onSelectSymbol,
}: WatchlistTableProps) {
  const [alertFormSymbol, setAlertFormSymbol] = useState<string | null>(null);

  if (loading) {
    return (
      <div role="status" className={styles.placeholder}>
        Loading your watchlist…
      </div>
    );
  }

  if (items.length === 0) {
    return <div className={styles.placeholder}>Nothing on your watchlist yet — search above to add a ticker.</div>;
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Watchlist</span>
        <span className={styles.cardCount}>
          {items.length} {items.length === 1 ? "ticker" : "tickers"}
        </span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.th}>Symbol</th>
            <th className={styles.th}>Price</th>
            <th className={styles.th}>Change</th>
            <th className={styles.th}>Session range</th>
            <th className={styles.th}>Trend</th>
            <th className={styles.th} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const state = prices[item.symbol];
            const bullish = (state?.changePercent ?? 0) >= 0;
            const alertFormOpen = alertFormSymbol === item.symbol;
            const striped = index % 2 === 1 ? ` ${styles.rowStriped}` : "";
            const rowClass = (alertFormOpen ? styles.rowNoBorder : styles.row) + striped;

            return (
              <Fragment key={item.id}>
                <tr className={rowClass}>
                  <td className={styles.td}>
                    <button
                      onClick={() => onSelectSymbol(item.symbol)}
                      aria-label={`Open ${item.symbol}`}
                      className={styles.symbolButton}
                    >
                      <TickerAvatar symbol={item.symbol} />
                      <span>
                        <strong className={`tabular-nums ${styles.symbolText}`}>{item.symbol}</strong>
                        <div className={styles.symbolName}>{item.name}</div>
                      </span>
                    </button>
                  </td>
                  <td className={styles.td}>
                    <PriceCell state={state} />
                  </td>
                  <td
                    className={`tabular-nums ${styles.changeCell} ${
                      state ? (bullish ? styles.changeBullish : styles.changeBearish) : ""
                    }`}
                  >
                    {state ? (
                      <>
                        {bullish ? <TrendUp size={16} aria-hidden /> : <TrendDown size={16} aria-hidden />}
                        {bullish ? "+" : ""}
                        {state.changePercent.toFixed(2)}%
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`tabular-nums ${styles.td} ${styles.rangeCell}`}>{sessionRange(state?.history)}</td>
                  <td className={styles.td}>
                    <Sparkline values={state?.history ?? []} bullish={bullish} />
                  </td>
                  <td className={styles.actionsCell}>
                    <button
                      onClick={() => setAlertFormSymbol(alertFormOpen ? null : item.symbol)}
                      aria-label={`Set a price alert for ${item.symbol}`}
                      aria-expanded={alertFormOpen}
                      className={`${styles.iconButton} ${alertFormOpen ? styles.iconButtonActive : ""}`}
                    >
                      <Bell size={18} weight={alertFormOpen ? "fill" : "regular"} aria-hidden />
                    </button>
                    <button
                      onClick={() => onRemove(item.symbol)}
                      aria-label={`Remove ${item.symbol} from watchlist`}
                      className={styles.iconButton}
                    >
                      <X size={18} aria-hidden />
                    </button>
                  </td>
                </tr>
                {alertFormOpen && (
                  <tr className={styles.row}>
                    <td colSpan={COLUMN_COUNT} className={styles.expandedCell}>
                      <AlertForm
                        symbol={item.symbol}
                        defaultThreshold={state?.price}
                        onSubmit={(threshold, direction) => {
                          onCreateAlert(item.symbol, threshold, direction);
                          setAlertFormSymbol(null);
                        }}
                        onCancel={() => setAlertFormSymbol(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
