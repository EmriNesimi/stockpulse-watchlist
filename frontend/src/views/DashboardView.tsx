import StatsRow from "../components/StatsRow";
import WatchlistTable from "../components/WatchlistTable";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";
import styles from "./DashboardView.module.css";

interface DashboardViewProps {
  items: WatchlistItem[];
  prices: Record<string, PriceState>;
  loading: boolean;
  onRemove: (symbol: string) => void;
  onCreateAlert: (symbol: string, threshold: number, direction: "above" | "below") => void;
}

export default function DashboardView({ items, prices, loading, onRemove, onCreateAlert }: DashboardViewProps) {
  return (
    <div className={styles.view}>
      <h1 className={styles.heading}>Your watchlist</h1>
      <StatsRow items={items} prices={prices} />
      <WatchlistTable
        items={items}
        prices={prices}
        loading={loading}
        onRemove={onRemove}
        onCreateAlert={onCreateAlert}
      />
    </div>
  );
}
