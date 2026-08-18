import { useState } from "react";
import StatsRow from "../components/StatsRow";
import PortfolioCards from "../components/PortfolioCards";
import FavoritesList from "../components/FavoritesList";
import SymbolChartPanel from "../components/SymbolChartPanel";
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
  onOpenSymbol: (symbol: string) => void;
}

export default function DashboardView({
  items,
  prices,
  loading,
  onRemove,
  onCreateAlert,
  onOpenSymbol,
}: DashboardViewProps) {
  // Which symbol the big chart is showing. Null means "first on the list",
  // so the panel is never blank when there's something to show, and the
  // selection survives the list re-ordering underneath it.
  const [focused, setFocused] = useState<string | null>(null);
  const focusedItem = items.find((i) => i.symbol === focused) ?? items[0];

  return (
    <div className={styles.view}>
      <h1 className="sr-only">Dashboard</h1>
      <StatsRow items={items} prices={prices} />

      <section>
        <h2 className={styles.sectionTitle}>My portfolio</h2>
        <PortfolioCards items={items} prices={prices} />
      </section>

      <div className={styles.split}>
        <SymbolChartPanel item={focusedItem} state={focusedItem ? prices[focusedItem.symbol] : undefined} />
        <FavoritesList items={items} prices={prices} onSelect={setFocused} />
      </div>

      <WatchlistTable
        items={items}
        prices={prices}
        loading={loading}
        onRemove={onRemove}
        onCreateAlert={onCreateAlert}
        onSelectSymbol={onOpenSymbol}
      />
    </div>
  );
}
