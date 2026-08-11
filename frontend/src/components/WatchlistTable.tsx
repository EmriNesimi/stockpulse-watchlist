import { Fragment, useState } from "react";
import { TrendUp, TrendDown, X, Bell } from "@phosphor-icons/react";
import Sparkline from "./Sparkline";
import PriceCell from "./PriceCell";
import AlertForm from "./AlertForm";
import CandlestickChart from "./CandlestickChart";
import { useHistory } from "../hooks/useHistory";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./WatchlistTable.module.css";

interface WatchlistTableProps {
  items: WatchlistItem[];
  prices: Record<string, PriceState>;
  loading?: boolean;
  onRemove: (symbol: string) => void;
  onCreateAlert: (symbol: string, threshold: number, direction: "above" | "below") => void;
}

function ChartRow({ symbol }: { symbol: string }) {
  const { candles, loading, error } = useHistory(symbol);
  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartLabel}>{symbol} · last 30 days</div>
      <CandlestickChart candles={candles} loading={loading} error={error} />
    </div>
  );
}

export default function WatchlistTable({ items, prices, loading = false, onRemove, onCreateAlert }: WatchlistTableProps) {
  const [alertFormSymbol, setAlertFormSymbol] = useState<string | null>(null);
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);

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
    <table className={styles.table}>
      <thead>
        <tr className={styles.headerRow}>
          <th className={styles.th}>Symbol</th>
          <th className={styles.th}>Price</th>
          <th className={styles.th}>Change</th>
          <th className={styles.th}>Trend</th>
          <th className={styles.th} />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const state = prices[item.symbol];
          const bullish = (state?.changePercent ?? 0) >= 0;
          const alertFormOpen = alertFormSymbol === item.symbol;
          const chartOpen = chartSymbol === item.symbol;
          const rowClass = alertFormOpen || chartOpen ? styles.rowNoBorder : styles.row;

          return (
            <Fragment key={item.id}>
              <tr className={rowClass}>
                <td className={styles.td}>
                  <button
                    onClick={() => {
                      setChartSymbol(chartOpen ? null : item.symbol);
                      setAlertFormSymbol(null);
                    }}
                    aria-label={`${chartOpen ? "Hide" : "Show"} price chart for ${item.symbol}`}
                    aria-expanded={chartOpen}
                    className={styles.symbolButton}
                  >
                    <strong className={`tabular-nums ${styles.symbolText}`}>{item.symbol}</strong>
                    <div className={styles.symbolName}>{item.name}</div>
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
                <td className={styles.td}>
                  <Sparkline values={state?.history ?? []} bullish={bullish} />
                </td>
                <td className={styles.actionsCell}>
                  <button
                    onClick={() => {
                      setAlertFormSymbol(alertFormOpen ? null : item.symbol);
                      setChartSymbol(null);
                    }}
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
                <tr className={chartOpen ? styles.rowNoBorder : styles.row}>
                  <td colSpan={5} className={styles.expandedCell}>
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
              {chartOpen && (
                <tr className={styles.row}>
                  <td colSpan={5} className={styles.expandedCell}>
                    <ChartRow symbol={item.symbol} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
