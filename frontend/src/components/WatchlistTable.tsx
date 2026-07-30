import { TrendUp, TrendDown, X } from "@phosphor-icons/react";
import Sparkline from "./Sparkline";
import PriceCell from "./PriceCell";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";

interface WatchlistTableProps {
  items: WatchlistItem[];
  prices: Record<string, PriceState>;
  onRemove: (symbol: string) => void;
}

export default function WatchlistTable({ items, prices, onRemove }: WatchlistTableProps) {
  if (items.length === 0) {
    return (
      <div
        style={{
          border: "1px dashed var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-6)",
          textAlign: "center",
          opacity: 0.7,
        }}
      >
        Nothing on your watchlist yet — search above to add a ticker.
      </div>
    );
  }

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
      }}
    >
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
          <th style={{ padding: "var(--space-2) var(--space-3)", fontWeight: 500, opacity: 0.7 }}>Symbol</th>
          <th style={{ padding: "var(--space-2) var(--space-3)", fontWeight: 500, opacity: 0.7 }}>Price</th>
          <th style={{ padding: "var(--space-2) var(--space-3)", fontWeight: 500, opacity: 0.7 }}>Change</th>
          <th style={{ padding: "var(--space-2) var(--space-3)", fontWeight: 500, opacity: 0.7 }}>Trend</th>
          <th style={{ padding: "var(--space-2) var(--space-3)" }} />
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const state = prices[item.symbol];
          const bullish = (state?.changePercent ?? 0) >= 0;

          return (
            <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <td style={{ padding: "var(--space-3)" }}>
                <strong className="tabular-nums">{item.symbol}</strong>
                <div style={{ fontSize: "0.8125rem", opacity: 0.6 }}>{item.name}</div>
              </td>
              <td style={{ padding: "var(--space-3)" }}>
                <PriceCell state={state} />
              </td>
              <td
                className="tabular-nums"
                style={{
                  padding: "var(--space-3)",
                  color: state ? (bullish ? "var(--color-bullish)" : "var(--color-bearish)") : undefined,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                }}
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
              <td style={{ padding: "var(--space-3)" }}>
                <Sparkline values={state?.history ?? []} bullish={bullish} />
              </td>
              <td style={{ padding: "var(--space-3)" }}>
                <button
                  onClick={() => onRemove(item.symbol)}
                  aria-label={`Remove ${item.symbol} from watchlist`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    minWidth: 44,
                    minHeight: 44,
                    background: "transparent",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-foreground)",
                    opacity: 0.6,
                  }}
                >
                  <X size={18} aria-hidden />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
