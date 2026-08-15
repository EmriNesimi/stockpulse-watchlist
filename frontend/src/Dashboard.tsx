import { useEffect, useMemo, useState } from "react";
import { ChartLineUp } from "@phosphor-icons/react";
import Search from "./components/Search";
import WatchlistTable from "./components/WatchlistTable";
import StatsRow from "./components/StatsRow";
import ConnectionBadge from "./components/ConnectionBadge";
import AlertToast from "./components/AlertToast";
import ErrorToast from "./components/ErrorToast";
import { useLiveTicks } from "./hooks/useLiveTicks";
import { useThrottledAnnouncement } from "./hooks/useThrottledAnnouncement";
import { useErrorToasts } from "./hooks/useErrorToasts";
import {
  addToWatchlist,
  createAlert,
  getWatchlist,
  removeFromWatchlist,
  type AuthUser,
  type TickerResult,
  type WatchlistItem,
} from "./lib/api";
import { MAX_WATCHLIST_SYMBOLS } from "./lib/limits";
import styles from "./App.module.css";

interface DashboardProps {
  user: AuthUser;
  onSignOut: () => void;
}

// Mounted fresh (see the key={user.id} in App.tsx) every time a different
// user signs in, so all of this component's state - watchlist items,
// prices, error toasts, fired-alert toasts - starts clean instead of
// carrying over stale data from whoever was signed in before.
export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  const symbols = useMemo(() => items.map((i) => i.symbol), [items]);
  const { prices, status, alertEvents, dismissAlert, wsError } = useLiveTicks(symbols);
  const announcement = useThrottledAnnouncement(items, prices);
  const { errors, pushError, dismissError } = useErrorToasts();

  useEffect(() => {
    getWatchlist()
      .then(({ items }) => setItems(items))
      .catch(() => pushError("Couldn't load your watchlist — check your connection and refresh."))
      .finally(() => setIsLoadingWatchlist(false));
    // pushError is stable for the lifetime of the hook, no need to re-run on identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wsError) pushError(wsError);
    // pushError is stable for the lifetime of the hook, no need to re-run on identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsError]);

  async function handleAdd(ticker: TickerResult) {
    try {
      const { item } = await addToWatchlist(ticker.symbol, ticker.name);
      setItems((prev) => [...prev, item]);
    } catch (err) {
      // The server's message distinguishes real cases (already on the
      // list, watchlist full) that "try again" would be actively
      // misleading for - a full watchlist will never succeed on retry.
      pushError(err instanceof Error ? err.message : `Couldn't add ${ticker.symbol} — try again.`);
    }
  }

  async function handleRemove(symbol: string) {
    const previous = items;
    setItems((prev) => prev.filter((i) => i.symbol !== symbol)); // optimistic
    try {
      await removeFromWatchlist(symbol);
    } catch {
      setItems(previous); // roll back if the backend rejected it
    }
  }

  async function handleCreateAlert(symbol: string, threshold: number, direction: "above" | "below") {
    try {
      await createAlert(symbol, threshold, direction);
    } catch (err) {
      pushError(err instanceof Error ? err.message : `Couldn't create the alert for ${symbol} — try again.`);
    }
  }

  return (
    <div className={styles.app}>
      <a href="#main-content" className="skip-link">
        Skip to watchlist
      </a>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <AlertToast alerts={alertEvents} onDismiss={dismissAlert} />
      <ErrorToast errors={errors} onDismiss={dismissError} />

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.brandRow}>
            <span className={styles.brandMark}>
              <ChartLineUp size={16} weight="bold" aria-hidden />
            </span>
            <span className={styles.brand}>StockPulse</span>
          </div>
          <ConnectionBadge status={status} />
        </div>
        <div className={styles.headerRight}>
          <Search
            onAdd={handleAdd}
            alreadyAdded={(symbol) => items.some((i) => i.symbol === symbol)}
            atCapacity={items.length >= MAX_WATCHLIST_SYMBOLS}
          />
          <div className={styles.account}>
            <span className={styles.accountEmail}>{user.email}</span>
            <button onClick={onSignOut} className={styles.signOutButton}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className={styles.main}>
        <h1 className={styles.pageHeading}>Your watchlist</h1>
        <StatsRow items={items} prices={prices} />
        <WatchlistTable
          items={items}
          prices={prices}
          loading={isLoadingWatchlist}
          onRemove={handleRemove}
          onCreateAlert={handleCreateAlert}
        />
      </main>
    </div>
  );
}
