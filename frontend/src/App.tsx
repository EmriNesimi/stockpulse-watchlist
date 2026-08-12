import { useEffect, useMemo, useState } from "react";
import Search from "./components/Search";
import WatchlistTable from "./components/WatchlistTable";
import ConnectionBadge from "./components/ConnectionBadge";
import AlertToast from "./components/AlertToast";
import ErrorToast from "./components/ErrorToast";
import AuthGate from "./components/AuthGate";
import { useLiveTicks } from "./hooks/useLiveTicks";
import { useThrottledAnnouncement } from "./hooks/useThrottledAnnouncement";
import { useErrorToasts } from "./hooks/useErrorToasts";
import {
  addToWatchlist,
  createAlert,
  getCurrentUser,
  getWatchlist,
  logout,
  removeFromWatchlist,
  type AuthUser,
  type TickerResult,
  type WatchlistItem,
} from "./lib/api";
import styles from "./App.module.css";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  const symbols = useMemo(() => items.map((i) => i.symbol), [items]);
  const { prices, status, alertEvents, dismissAlert } = useLiveTicks(authStatus === "authenticated" ? symbols : []);
  const announcement = useThrottledAnnouncement(items, prices);
  const { errors, pushError, dismissError } = useErrorToasts();

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => {
        setUser(user);
        setAuthStatus("authenticated");
      })
      .catch(() => setAuthStatus("unauthenticated"));
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    getWatchlist()
      .then(({ items }) => setItems(items))
      .catch(() => pushError("Couldn't load your watchlist — check your connection and refresh."))
      .finally(() => setIsLoadingWatchlist(false));
    // pushError is stable for the lifetime of the hook, no need to re-run on identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  function handleAuthenticated(authenticatedUser: AuthUser) {
    setUser(authenticatedUser);
    setAuthStatus("authenticated");
  }

  async function handleSignOut() {
    await logout().catch(() => {
      /* cookie may already be gone server-side; clearing local state either way */
    });
    setUser(null);
    setItems([]);
    setIsLoadingWatchlist(true);
    setAuthStatus("unauthenticated");
  }

  async function handleAdd(ticker: TickerResult) {
    try {
      const { item } = await addToWatchlist(ticker.symbol, ticker.name);
      setItems((prev) => [...prev, item]);
    } catch {
      pushError(`Couldn't add ${ticker.symbol} — try again.`);
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
    } catch {
      pushError(`Couldn't create the alert for ${symbol} — try again.`);
    }
  }

  if (authStatus === "checking") {
    return null;
  }

  if (authStatus === "unauthenticated") {
    return <AuthGate onAuthenticated={handleAuthenticated} />;
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
          <span className={styles.brand}>StockPulse</span>
          <ConnectionBadge status={status} />
        </div>
        <div className={styles.headerRight}>
          <Search onAdd={handleAdd} alreadyAdded={(symbol) => items.some((i) => i.symbol === symbol)} />
          <div className={styles.account}>
            <span className={styles.accountEmail}>{user?.email}</span>
            <button onClick={handleSignOut} className={styles.signOutButton}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className={styles.main}>
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
