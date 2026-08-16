import { useState } from "react";
import { TrendDown, TrendUp } from "@phosphor-icons/react";
import CandlestickChart from "./CandlestickChart";
import TickerAvatar from "./TickerAvatar";
import { useHistory } from "../hooks/useHistory";
import { formatCurrency, formatSignedPercent } from "../lib/format";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./SymbolChartPanel.module.css";

// The reference shows 1 Day through 3 Years, but /api/history only serves
// 7-365 days, so these are the ranges that map to something the backend can
// actually return. Offering a "1 Day" pill that errors would be worse than
// not offering it.
const RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
] as const;

const DEFAULT_RANGE = 30;

interface SymbolChartPanelProps {
  item: WatchlistItem | undefined;
  state: PriceState | undefined;
}

export default function SymbolChartPanel({ item, state }: SymbolChartPanelProps) {
  const [days, setDays] = useState<number>(DEFAULT_RANGE);
  const { candles, loading, error } = useHistory(item?.symbol ?? null, days);

  if (!item) {
    return (
      <section className={styles.card}>
        <p className={styles.empty}>Add a ticker to see its price history here.</p>
      </section>
    );
  }

  const up = (state?.changePercent ?? 0) >= 0;

  return (
    <section className={styles.card} aria-labelledby="chart-panel-symbol">
      <div className={styles.header}>
        <TickerAvatar symbol={item.symbol} size={40} />
        <span className={styles.names}>
          <span id="chart-panel-symbol" className={styles.symbol}>
            {item.symbol}
          </span>
          <span className={styles.name}>{item.name}</span>
        </span>
        <span className={styles.figures}>
          <span className={`tabular-nums ${styles.price}`}>{state ? formatCurrency(state.price) : "—"}</span>
          <span className={`tabular-nums ${styles.change} ${state ? (up ? styles.bullish : styles.bearish) : ""}`}>
            {state ? (
              <>
                {up ? <TrendUp size={14} aria-hidden /> : <TrendDown size={14} aria-hidden />}
                {formatSignedPercent(state.changePercent)}
              </>
            ) : (
              "—"
            )}
          </span>
        </span>
      </div>

      <div className={styles.ranges} role="group" aria-label="Chart range">
        {RANGES.map((range) => (
          <button
            key={range.label}
            type="button"
            onClick={() => setDays(range.days)}
            aria-pressed={days === range.days}
            className={days === range.days ? `${styles.range} ${styles.rangeActive}` : styles.range}
          >
            {range.label}
          </button>
        ))}
      </div>

      <CandlestickChart candles={candles} loading={loading} error={error} />
    </section>
  );
}
