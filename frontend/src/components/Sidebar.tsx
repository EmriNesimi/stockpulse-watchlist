import { ChartLineUp, SignOut, SquaresFour, User, Wallet } from "@phosphor-icons/react";
import type { ViewName } from "../lib/views";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  current: ViewName;
  onNavigate: (view: ViewName) => void;
  onSignOut: () => void;
}

// "stock" isn't in this list on purpose - the detail screen is reached by
// clicking a ticker, not from the nav, so it has no entry of its own. It
// keeps Dashboard highlighted while you're down there, which matches how the
// reference treats drill-down screens.
const PRIMARY = [
  { view: "dashboard" as const, label: "Dashboard", Icon: SquaresFour },
  { view: "wallet" as const, label: "Wallet", Icon: Wallet },
];

const ACCOUNT = [{ view: "profile" as const, label: "Profile", Icon: User }];

export default function Sidebar({ current, onNavigate, onSignOut }: SidebarProps) {
  function renderItem({ view, label, Icon }: (typeof PRIMARY)[number] | (typeof ACCOUNT)[number]) {
    const active = current === view || (view === "dashboard" && current === "stock");
    return (
      <button
        key={view}
        type="button"
        onClick={() => onNavigate(view)}
        aria-current={active ? "page" : undefined}
        // Below 1000px the CSS hides .label with display:none, which drops it
        // out of the accessibility tree entirely - and the icon is aria-hidden,
        // so without this the button would have no accessible name at all.
        aria-label={label}
        className={active ? `${styles.item} ${styles.itemActive}` : styles.item}
      >
        <Icon size={20} className={styles.icon} aria-hidden />
        <span className={styles.label}>{label}</span>
      </button>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandRow}>
        <span className={styles.brandMark}>
          <ChartLineUp size={18} weight="bold" aria-hidden />
        </span>
        <span className={styles.brand}>StockPulse</span>
      </div>

      <nav className={styles.nav} aria-label="Main">
        {PRIMARY.map(renderItem)}
        <span className={styles.groupLabel}>Account</span>
        {ACCOUNT.map(renderItem)}
      </nav>

      <button
        type="button"
        onClick={onSignOut}
        aria-label="Sign out"
        className={`${styles.item} ${styles.signOut}`}
      >
        <SignOut size={20} className={styles.icon} aria-hidden />
        <span className={styles.label}>Sign out</span>
      </button>
    </aside>
  );
}
