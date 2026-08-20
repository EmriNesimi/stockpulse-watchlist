import { memo } from "react";
import { Bell, TrendDown, TrendUp, X } from "@phosphor-icons/react";
import PriceCell from "./PriceCell";
import Sparkline from "./Sparkline";
import TickerAvatar from "./TickerAvatar";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./WatchlistTable.module.css";

interface WatchlistRowProps {
  item: WatchlistItem;
  /** This row's price only - not the whole record, so a tick elsewhere doesn't re-render it. */
  state: PriceState | undefined;
  striped: boolean;
  alertOpen: boolean;
  onSelectSymbol: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onToggleAlert: (symbol: string) => void;
  registerBellRef: (symbol: string, el: HTMLButtonElement | null) => void;
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

// Memoised deliberately. useLiveTicks replaces the whole `prices` object on
// every tick, and a tick arrives roughly every 1.5s per symbol - so with a
// dozen symbols the table used to re-run every row's render body several times
// a second, recomputing min/max over each history and rebuilding every
// sparkline path, even though only one row's number actually changed.
//
// This only holds while the callbacks stay referentially stable, which is why
// they're useCallback'd in Dashboard.
function WatchlistRow({
  item,
  state,
  striped,
  alertOpen,
  onSelectSymbol,
  onRemove,
  onToggleAlert,
  registerBellRef,
}: WatchlistRowProps) {
  const bullish = (state?.changePercent ?? 0) >= 0;
  const rowClass = (alertOpen ? styles.rowNoBorder : styles.row) + (striped ? ` ${styles.rowStriped}` : "");

  return (
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
          ref={(el) => {
            registerBellRef(item.symbol, el);
          }}
          onClick={() => onToggleAlert(item.symbol)}
          aria-label={`Set a price alert for ${item.symbol}`}
          aria-expanded={alertOpen}
          className={`${styles.iconButton} ${alertOpen ? styles.iconButtonActive : ""}`}
        >
          <Bell size={18} weight={alertOpen ? "fill" : "regular"} aria-hidden />
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
  );
}

export default memo(WatchlistRow);
