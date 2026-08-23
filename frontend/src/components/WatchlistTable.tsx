import { Fragment, useCallback, useRef, useState } from "react";
import AlertForm from "./AlertForm";
import WatchlistRow from "./WatchlistRow";
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

export default function WatchlistTable({
  items,
  prices,
  loading = false,
  onRemove,
  onCreateAlert,
  onSelectSymbol,
}: WatchlistTableProps) {
  const [alertFormSymbol, setAlertFormSymbol] = useState<string | null>(null);
  // The alert form unmounts with focus still inside it, which drops focus to
  // <body>. Hand it back to the bell that opened it.
  const bellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function closeAlertForm(symbol: string) {
    setAlertFormSymbol(null);
    bellRefs.current[symbol]?.focus();
  }

  // Stable identities, or memo() on the row buys nothing.
  const registerBellRef = useCallback((symbol: string, el: HTMLButtonElement | null) => {
    bellRefs.current[symbol] = el;
  }, []);
  const toggleAlertForm = useCallback((symbol: string) => {
    setAlertFormSymbol((open) => (open === symbol ? null : symbol));
  }, []);

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
        <h2 className={styles.cardTitle}>Watchlist</h2>
        <span className={styles.cardCount}>
          {items.length} {items.length === 1 ? "ticker" : "tickers"}
        </span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th scope="col" className={styles.th}>Symbol</th>
            <th scope="col" className={styles.th}>Price</th>
            <th scope="col" className={styles.th}>Change</th>
            <th scope="col" className={styles.th}>Session range</th>
            <th scope="col" className={styles.th}>Trend</th>
            <th scope="col" className={styles.th}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const state = prices[item.symbol];
            const alertFormOpen = alertFormSymbol === item.symbol;

            return (
              <Fragment key={item.id}>
                <WatchlistRow
                  item={item}
                  state={state}
                  striped={index % 2 === 1}
                  alertOpen={alertFormOpen}
                  onSelectSymbol={onSelectSymbol}
                  onRemove={onRemove}
                  onToggleAlert={toggleAlertForm}
                  registerBellRef={registerBellRef}
                />
                {alertFormOpen && (
                  <tr className={styles.row}>
                    <td colSpan={COLUMN_COUNT} className={styles.expandedCell}>
                      <AlertForm
                        symbol={item.symbol}
                        defaultThreshold={state?.price}
                        onSubmit={(threshold, direction) => {
                          onCreateAlert(item.symbol, threshold, direction);
                          closeAlertForm(item.symbol);
                        }}
                        onCancel={() => closeAlertForm(item.symbol)}
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
