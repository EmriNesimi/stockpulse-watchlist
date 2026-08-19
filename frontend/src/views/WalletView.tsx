import { useMemo } from "react";
import { TrendDown, TrendUp } from "@phosphor-icons/react";
import TickerAvatar from "../components/TickerAvatar";
import { portfolioTotals, toHoldings, valueHolding } from "../lib/holdings";
import { formatCurrency, formatShares, formatSignedCurrency, formatSignedPercent } from "../lib/format";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./WalletView.module.css";

interface WalletViewProps {
  items: WatchlistItem[];
  prices: Record<string, PriceState>;
}

// Every figure here is derived from the shares and cost basis the user
// entered plus the live price. Nothing is stubbed: with no positions the
// screen says so, and while a price is still missing the affected totals
// render as a dash rather than a number that would quietly be wrong.
export default function WalletView({ items, prices }: WalletViewProps) {
  // Recomputed on every tick otherwise, and a tick arrives roughly every 1.5s
  // per symbol - so this ran O(holdings) times a second while the screen was
  // just sitting there.
  const valued = useMemo(() => toHoldings(items).map((h) => valueHolding(h, prices)), [items, prices]);
  const totals = useMemo(() => portfolioTotals(valued), [valued]);
  const up = (totals.gain ?? 0) >= 0;

  if (valued.length === 0) {
    return (
      <div className={styles.view}>
        <h1 className={styles.heading}>Wallet</h1>
        <section className={styles.card}>
          <div className={styles.empty}>
            <span className={styles.emptyTitle}>No positions yet</span>
            <span className={styles.emptyBody}>
              Add the shares and cost basis for a ticker on the Profile screen and your profit will be tracked here.
            </span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.view}>
      <h1 className={styles.heading}>Wallet</h1>

      <section className={styles.card} aria-labelledby="wallet-total">
        <div className={styles.summary}>
          <span id="wallet-total" className={styles.summaryLabel}>
            Total value
          </span>
          <span className={`tabular-nums ${styles.summaryValue}`}>
            {totals.marketValue === undefined ? "—" : formatCurrency(totals.marketValue)}
          </span>
          {totals.gain === undefined ? (
            <span className={styles.pending}>Waiting for prices on every holding…</span>
          ) : (
            <span className={`tabular-nums ${styles.summaryChange} ${up ? styles.bullish : styles.bearish}`}>
              {up ? <TrendUp size={16} aria-hidden /> : <TrendDown size={16} aria-hidden />}
              {formatSignedCurrency(totals.gain)}
              {totals.gainPercent !== undefined && ` (${formatSignedPercent(totals.gainPercent)})`}
            </span>
          )}
        </div>

        <div className={styles.figures}>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Total cost</span>
            <span className={`tabular-nums ${styles.figureValue}`}>{formatCurrency(totals.cost)}</span>
          </div>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Total profit</span>
            <span
              className={`tabular-nums ${styles.figureValue} ${
                totals.gain === undefined ? "" : up ? styles.bullish : styles.bearish
              }`}
            >
              {totals.gain === undefined ? "—" : formatSignedCurrency(totals.gain)}
            </span>
          </div>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Positions</span>
            <span className={`tabular-nums ${styles.figureValue}`}>{valued.length}</span>
          </div>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="wallet-breakdown">
        <h2 id="wallet-breakdown" className={styles.sectionTitle}>
          Holdings
        </h2>
        <div className={styles.scroll} tabIndex={0} role="region" aria-label="Holdings breakdown">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.th}>Symbol</th>
                <th scope="col" className={`${styles.th} ${styles.thNumeric}`}>Shares</th>
                <th scope="col" className={`${styles.th} ${styles.thNumeric}`}>Cost basis</th>
                <th scope="col" className={`${styles.th} ${styles.thNumeric}`}>Price</th>
                <th scope="col" className={`${styles.th} ${styles.thNumeric}`}>Value</th>
                <th scope="col" className={`${styles.th} ${styles.thNumeric}`}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {valued.map(({ item, shares, costBasis, price, marketValue, gain, gainPercent }) => {
                const rowUp = (gain ?? 0) >= 0;
                return (
                  <tr key={item.id} className={styles.row}>
                    <td className={styles.td}>
                      <span className={styles.symbolCell}>
                        <TickerAvatar symbol={item.symbol} size={32} />
                        <span className={styles.symbol}>{item.symbol}</span>
                      </span>
                    </td>
                    <td className={`tabular-nums ${styles.tdNumeric}`}>{formatShares(shares)}</td>
                    <td className={`tabular-nums ${styles.tdNumeric}`}>{formatCurrency(costBasis)}</td>
                    <td className={`tabular-nums ${styles.tdNumeric}`}>
                      {price === undefined ? "—" : formatCurrency(price)}
                    </td>
                    <td className={`tabular-nums ${styles.tdNumeric}`}>
                      {marketValue === undefined ? "—" : formatCurrency(marketValue)}
                    </td>
                    <td
                      className={`tabular-nums ${styles.tdNumeric} ${
                        gain === undefined ? "" : rowUp ? styles.bullish : styles.bearish
                      }`}
                    >
                      {gain === undefined
                        ? "—"
                        : `${formatSignedCurrency(gain)}${
                            gainPercent === undefined ? "" : ` (${formatSignedPercent(gainPercent)})`
                          }`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
