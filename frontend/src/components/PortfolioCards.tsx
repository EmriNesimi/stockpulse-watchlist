import { useMemo } from "react";
import Sparkline from "./Sparkline";
import TickerAvatar from "./TickerAvatar";
import { toHoldings, valueHolding } from "../lib/holdings";
import { formatCurrency, formatShares, formatSignedCurrency, formatSignedPercent } from "../lib/format";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./PortfolioCards.module.css";

interface PortfolioCardsProps {
  items: WatchlistItem[];
  prices: Record<string, PriceState>;
}

// One card per open position. Everything shown is derived from shares and
// cost basis the user entered plus the live price - nothing is stubbed, so a
// user with no positions gets a prompt instead of invented numbers.
export default function PortfolioCards({ items, prices }: PortfolioCardsProps) {
  const holdings = useMemo(() => toHoldings(items), [items]);

  if (holdings.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyTitle}>No positions yet</span>
        <span className={styles.emptyBody}>
          Add the shares and cost basis for a ticker on the Profile screen and its return will show up here.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.rail}>
      {holdings.map((holding) => {
        const { item, shares, price, marketValue, gain, gainPercent } = valueHolding(holding, prices);
        const up = (gain ?? 0) >= 0;

        return (
          <article key={item.id} className={styles.card}>
            <div className={styles.cardTop}>
              <TickerAvatar symbol={item.symbol} size={32} />
              <span className={styles.symbol}>{item.symbol}</span>
              <span className={styles.spark}>
                <Sparkline values={prices[item.symbol]?.history ?? []} bullish={up} />
              </span>
            </div>

            <div className={styles.rows}>
              <div className={styles.row}>
                <span className={styles.label}>Shares</span>
                <span className={`tabular-nums ${styles.value}`}>{formatShares(shares)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Market value</span>
                <span className={`tabular-nums ${styles.value}`}>
                  {marketValue === undefined ? "—" : formatCurrency(marketValue)}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Return</span>
                <span
                  className={`tabular-nums ${styles.value} ${gain === undefined ? "" : up ? styles.bullish : styles.bearish}`}
                >
                  {gain === undefined
                    ? "—"
                    : `${formatSignedCurrency(gain)}${
                        gainPercent === undefined ? "" : ` (${formatSignedPercent(gainPercent)})`
                      }`}
                </span>
              </div>
            </div>

            <span className="sr-only">
              {price === undefined
                ? `${item.symbol}: waiting for a price.`
                : `${item.symbol} at ${formatCurrency(price)} a share.`}
            </span>
          </article>
        );
      })}
    </div>
  );
}
