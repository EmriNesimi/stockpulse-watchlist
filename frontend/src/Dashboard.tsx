import { useEffect, useMemo, useRef, useState } from "react";
import Search from "./components/Search";
import Sidebar from "./components/Sidebar";
import ConnectionBadge from "./components/ConnectionBadge";
import AlertToast from "./components/AlertToast";
import ErrorToast from "./components/ErrorToast";
import VerificationBanner from "./components/VerificationBanner";
import ThemeToggle from "./components/ThemeToggle";
import DashboardView from "./views/DashboardView";
import ProfileView from "./views/ProfileView";
import WalletView from "./views/WalletView";
import StockDetailView from "./views/StockDetailView";
import type { Theme } from "./hooks/useTheme";
import type { View, ViewName } from "./lib/views";
import { useLiveTicks } from "./hooks/useLiveTicks";
import { useThrottledAnnouncement } from "./hooks/useThrottledAnnouncement";
import { useErrorToasts } from "./hooks/useErrorToasts";
import {
  addToWatchlist,
  createAlert,
  getWatchlist,
  removeFromWatchlist,
  updateHoldings,
  type AuthUser,
  type TickerResult,
  type WatchlistItem,
} from "./lib/api";
import { MAX_WATCHLIST_SYMBOLS } from "./lib/limits";
import styles from "./App.module.css";

interface DashboardProps {
  user: AuthUser;
  onSignOut: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

// Mounted fresh (see the key={user.id} in App.tsx) every time a different
// user signs in, so all of this component's state - watchlist items,
// prices, error toasts, fired-alert toasts - starts clean instead of
// carrying over stale data from whoever was signed in before.
//
// This is the authenticated shell rather than a single screen: it owns the
// watchlist and the live-tick subscription, and swaps the content column
// between views. Keeping the subscription up here means navigating doesn't
// tear down and re-open the WebSocket.
export default function Dashboard({ user, onSignOut, theme, onToggleTheme }: DashboardProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  const [view, setView] = useState<View>({ name: "dashboard" });
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

  // Rethrows so HoldingsForm can show the failure inline next to the inputs
  // it came from, rather than as a toast detached from the form.
  async function handleSaveHoldings(symbol: string, shares: number, costBasis: number) {
    const { item } = await updateHoldings(symbol, shares, costBasis);
    setItems((prev) => prev.map((i) => (i.symbol === symbol ? item : i)));
  }

  async function handleClearHoldings(symbol: string) {
    const { item } = await updateHoldings(symbol, null, null);
    setItems((prev) => prev.map((i) => (i.symbol === symbol ? item : i)));
  }

  // Swapping the content column leaves focus wherever it was - often on a
  // control that just unmounted, which drops focus to <body>. Moving it to
  // <main> (already tabIndex={-1} for the skip link) keeps keyboard and
  // screen-reader users oriented. Skipped on first render so we don't yank
  // focus on load.
  const mainRef = useRef<HTMLElement>(null);
  const viewKey = view.name === "stock" ? `stock:${view.symbol}` : view.name;
  const isFirstView = useRef(true);
  useEffect(() => {
    if (isFirstView.current) {
      isFirstView.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [viewKey]);

  function handleNavigate(name: ViewName) {
    // "stock" is deliberately unreachable from the nav - it needs a symbol,
    // so it's only entered by picking one out of a list.
    if (name === "dashboard" || name === "wallet" || name === "profile") {
      setView({ name });
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

      <Sidebar current={view.name} onNavigate={handleNavigate} onSignOut={onSignOut} />

      <div className={styles.column}>
        <header className={styles.topbar}>
          <Search
            onAdd={handleAdd}
            alreadyAdded={(symbol) => items.some((i) => i.symbol === symbol)}
            atCapacity={items.length >= MAX_WATCHLIST_SYMBOLS}
          />
          <div className={styles.topbarRight}>
            <ConnectionBadge status={status} />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <div className={styles.account}>
              <span className={styles.accountAvatar} aria-hidden>
                {user.email.slice(0, 2)}
              </span>
              <span className={styles.accountEmail}>{user.email}</span>
            </div>
          </div>
        </header>

        {!user.emailVerified && <VerificationBanner onError={pushError} />}

        <main id="main-content" ref={mainRef} tabIndex={-1} className={styles.main}>
          {view.name === "dashboard" && (
            <DashboardView
              items={items}
              prices={prices}
              loading={isLoadingWatchlist}
              onRemove={handleRemove}
              onCreateAlert={handleCreateAlert}
              onOpenSymbol={(symbol) => setView({ name: "stock", symbol })}
            />
          )}
          {view.name === "stock" && (
            <StockDetailView
              item={items.find((i) => i.symbol === view.symbol)}
              prices={prices}
              onBack={() => setView({ name: "dashboard" })}
              onCreateAlert={handleCreateAlert}
            />
          )}
          {view.name === "wallet" && <WalletView items={items} prices={prices} />}
          {view.name === "profile" && (
            <ProfileView
              user={user}
              items={items}
              onSaveHoldings={handleSaveHoldings}
              onClearHoldings={handleClearHoldings}
            />
          )}
        </main>
      </div>
    </div>
  );
}
