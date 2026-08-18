import { useRef, useState } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import TickerAvatar from "../components/TickerAvatar";
import HoldingsForm from "../components/HoldingsForm";
import { formatCurrency, formatShares } from "../lib/format";
import type { AuthUser, WatchlistItem } from "../lib/api";
import styles from "./ProfileView.module.css";

interface ProfileViewProps {
  user: AuthUser;
  items: WatchlistItem[];
  onSaveHoldings: (symbol: string, shares: number, costBasis: number) => Promise<void>;
  onClearHoldings: (symbol: string) => Promise<void>;
}

export default function ProfileView({ user, items, onSaveHoldings, onClearHoldings }: ProfileViewProps) {
  const [editing, setEditing] = useState<string | null>(null);
  // Same as the alert form: the holdings form unmounts with focus inside it,
  // so hand focus back to the Edit/Add button that opened it.
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function closeForm(symbol: string) {
    setEditing(null);
    triggerRefs.current[symbol]?.focus();
  }

  return (
    <div className={styles.view}>
      <h1 className={styles.heading}>Profile</h1>

      <section className={styles.card}>
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden>
            {user.email.slice(0, 2)}
          </span>
          <span className={styles.identityText}>
            <span className={styles.email}>{user.email}</span>
            {user.emailVerified ? (
              <span className={`${styles.badge} ${styles.verified}`}>
                <CheckCircle size={14} weight="fill" aria-hidden />
                Email verified
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.unverified}`}>
                <WarningCircle size={14} weight="fill" aria-hidden />
                Email not verified
              </span>
            )}
          </span>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="positions-title">
        <div className={styles.sectionHeader}>
          <h2 id="positions-title" className={styles.sectionTitle}>
            Your positions
          </h2>
          <span className={styles.sectionHint}>Shares and cost basis drive the wallet totals</span>
        </div>

        {items.length === 0 ? (
          <p className={styles.empty}>Nothing on your watchlist yet — search above to add a ticker.</p>
        ) : (
          <div className={styles.list}>
            {items.map((item) => {
              const held = item.shares !== null && item.costBasis !== null;
              const open = editing === item.symbol;

              return (
                <div key={item.id} className={styles.entry}>
                  <div className={styles.entryRow}>
                    <TickerAvatar symbol={item.symbol} size={36} />
                    <span className={styles.names}>
                      <span className={styles.symbol}>{item.symbol}</span>
                      <span className={styles.name}>{item.name}</span>
                    </span>

                    <span className={styles.position}>
                      <span className={styles.positionFigures}>
                        {held ? (
                          <>
                            <span className={`tabular-nums ${styles.positionValue}`}>
                              {formatShares(item.shares!)} @ {formatCurrency(item.costBasis!)}
                            </span>
                            <span className={styles.positionLabel}>shares @ cost</span>
                          </>
                        ) : (
                          <span className={styles.positionLabel}>Watching only</span>
                        )}
                      </span>
                      <button
                        type="button"
                        ref={(el) => {
                          triggerRefs.current[item.symbol] = el;
                        }}
                        onClick={() => setEditing(open ? null : item.symbol)}
                        aria-expanded={open}
                        aria-label={`${held ? "Edit" : "Add"} holdings for ${item.symbol}`}
                        className={styles.editButton}
                      >
                        {held ? "Edit" : "Add"}
                      </button>
                    </span>
                  </div>

                  {open && (
                    <div className={styles.formWrap}>
                      <HoldingsForm
                        item={item}
                        onSave={async (shares, costBasis) => {
                          await onSaveHoldings(item.symbol, shares, costBasis);
                          closeForm(item.symbol);
                        }}
                        onClear={async () => {
                          await onClearHoldings(item.symbol);
                          closeForm(item.symbol);
                        }}
                        onCancel={() => closeForm(item.symbol)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
