import { useRef, useState } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import TickerAvatar from "../components/TickerAvatar";
import HoldingsForm from "../components/HoldingsForm";
import { formatCurrency, formatShares } from "../lib/format";
import { logoutEverywhere, type AuthUser, type WatchlistItem } from "../lib/api";
import styles from "./ProfileView.module.css";

interface ProfileViewProps {
  user: AuthUser;
  items: WatchlistItem[];
  onSaveHoldings: (symbol: string, shares: number, costBasis: number) => Promise<void>;
  onClearHoldings: (symbol: string) => Promise<void>;
  /** Called once every session has been ended, so the app can drop local state. */
  onSignedOutEverywhere: () => void;
}

export default function ProfileView({
  user,
  items,
  onSaveHoldings,
  onClearHoldings,
  onSignedOutEverywhere,
}: ProfileViewProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmingSignOutAll, setConfirmingSignOutAll] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [signOutAllError, setSignOutAllError] = useState<string | null>(null);

  async function handleSignOutEverywhere() {
    setSignOutAllError(null);
    setSigningOutAll(true);
    try {
      await logoutEverywhere();
      onSignedOutEverywhere();
    } catch (err) {
      // Left on screen rather than swallowed: someone doing this has usually
      // lost a device, and silently failing is the worst possible outcome.
      setSignOutAllError(err instanceof Error ? err.message : "Couldn't sign out everywhere");
      setSigningOutAll(false);
    }
  }
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

        <div className={styles.sessions}>
          <div>
            <h2 className={styles.sessionsTitle}>Signed in elsewhere?</h2>
            <p className={styles.sessionsHint}>
              Ends every session on every device, including this one. Use it if you've lost a device or
              think someone else has your password.
            </p>
          </div>

          {confirmingSignOutAll ? (
            <div className={styles.confirmRow}>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleSignOutEverywhere}
                disabled={signingOutAll}
              >
                {signingOutAll ? "Signing out…" : "Yes, sign out everywhere"}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setConfirmingSignOutAll(false)}
                disabled={signingOutAll}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setConfirmingSignOutAll(true)}
            >
              Sign out everywhere
            </button>
          )}

          {signOutAllError && (
            <p role="alert" className={styles.sessionsError}>
              {signOutAllError}
            </p>
          )}
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
              // Destructured so TypeScript actually narrows them. Checking
              // `item.shares !== null` through a boolean alias doesn't
              // propagate, which is why this used to need `!` assertions.
              const { shares, costBasis } = item;
              const open = editing === item.symbol;
              const held = shares !== null && costBasis !== null;

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
                              {formatShares(shares)} @ {formatCurrency(costBasis)}
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
