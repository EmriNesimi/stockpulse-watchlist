import { useMemo } from "react";
import Sparkline from "./Sparkline";
import TickerAvatar from "./TickerAvatar";
import { toHoldings, valueHolding } from "../lib/holdings";
import { formatCurrency, formatShares, formatSignedCurrency, formatSignedPercent, priceDirection } from "../lib/format";
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
        // From the position's return, not the day's tick — this card is about
        // profit and loss. undefined means no price yet, which is flat rather
        // than a gain.
        const direction = gainPercent === undefined ? "flat" : priceDirection(gainPercent);

        return (
          <article key={item.id} className={styles.card}>
            <div className={styles.cardTop}>
              <TickerAvatar symbol={item.symbol} size={32} />
              <span className={styles.symbol}>{item.symbol}</span>
              <span className={styles.spark}>
                <Sparkline values={prices[item.symbol]?.history ?? []} direction={direction} />
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
                  className={`tabular-nums ${styles.value} ${direction === "up" ? styles.bullish : direction === "down" ? styles.bearish : ""}`}
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
