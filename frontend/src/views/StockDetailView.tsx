import { ArrowLeft } from "@phosphor-icons/react";
import SymbolChartPanel from "../components/SymbolChartPanel";
import AlertForm from "../components/AlertForm";
import { toHoldings, valueHolding } from "../lib/holdings";
import { formatCurrency, formatShares, formatSignedCurrency, formatSignedPercent } from "../lib/format";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./StockDetailView.module.css";

interface StockDetailViewProps {
  item: WatchlistItem | undefined;
  prices: Record<string, PriceState>;
  onBack: () => void;
  onCreateAlert: (symbol: string, threshold: number, direction: "above" | "below") => void;
}

export default function StockDetailView({ item, prices, onBack, onCreateAlert }: StockDetailViewProps) {
  // Can happen if the symbol is removed from the watchlist while its detail
  // screen is open, rather than being a state that's navigated to directly.
  if (!item) {
    return (
      <div className={styles.view}>
        <button type="button" onClick={onBack} className={styles.backButton}>
          <ArrowLeft size={16} aria-hidden />
          Back to dashboard
        </button>
        <section className={styles.card}>
          <p className={styles.empty}>That ticker isn't on your watchlist any more.</p>
        </section>
      </div>
    );
  }

  const state = prices[item.symbol];
  const [holding] = toHoldings([item]);
  const position = holding ? valueHolding(holding, prices) : null;
  const up = (position?.gain ?? 0) >= 0;

  return (
    <div className={styles.view}>
      <button type="button" onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={16} aria-hidden />
        Back to dashboard
      </button>

      <SymbolChartPanel item={item} state={state} />

      {position && (
        <section className={styles.card} aria-labelledby="detail-position">
          <div className={styles.alertHeader}>
            <h2 id="detail-position" className={styles.sectionTitle}>
              Your position
            </h2>
          </div>
          <div className={styles.positionRow}>
            <div className={styles.figure}>
              <span className={styles.figureLabel}>Shares</span>
              <span className={`tabular-nums ${styles.figureValue}`}>{formatShares(position.shares)}</span>
            </div>
            <div className={styles.figure}>
              <span className={styles.figureLabel}>Cost basis</span>
              <span className={`tabular-nums ${styles.figureValue}`}>{formatCurrency(position.costBasis)}</span>
            </div>
            <div className={styles.figure}>
              <span className={styles.figureLabel}>Market value</span>
              <span className={`tabular-nums ${styles.figureValue}`}>
                {position.marketValue === undefined ? "—" : formatCurrency(position.marketValue)}
              </span>
            </div>
            <div className={styles.figure}>
              <span className={styles.figureLabel}>Profit</span>
              <span
                className={`tabular-nums ${styles.figureValue} ${
                  position.gain === undefined ? "" : up ? styles.bullish : styles.bearish
                }`}
              >
                {position.gain === undefined
                  ? "—"
                  : `${formatSignedCurrency(position.gain)}${
                      position.gainPercent === undefined ? "" : ` (${formatSignedPercent(position.gainPercent)})`
                    }`}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className={styles.card} aria-labelledby="detail-alert">
        <div className={styles.alertHeader}>
          <h2 id="detail-alert" className={styles.sectionTitle}>
            Price alert
          </h2>
          <span className={styles.sectionHint}>Fires once the price crosses your threshold</span>
        </div>
        <AlertForm
          symbol={item.symbol}
          defaultThreshold={state?.price}
          onSubmit={(threshold, direction) => onCreateAlert(item.symbol, threshold, direction)}
          onCancel={onBack}
        />
      </section>
    </div>
  );
}
