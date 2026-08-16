import type { WatchlistItem } from "./api";
import type { PriceState } from "../types";

// A watchlist row that actually has a position attached, with the nullable
// fields narrowed away so callers don't have to keep re-checking them.
export interface Holding {
  item: WatchlistItem;
  shares: number;
  costBasis: number;
}

export interface HoldingValue extends Holding {
  /** Live price, or undefined until the first tick arrives for this symbol. */
  price: number | undefined;
  /** shares × costBasis - what was paid, known without any price data. */
  cost: number;
  /** shares × price, or undefined with no price yet. */
  marketValue: number | undefined;
  /** marketValue - cost, or undefined with no price yet. */
  gain: number | undefined;
  /** gain as a percentage of cost, or undefined with no price yet. */
  gainPercent: number | undefined;
}

export function toHoldings(items: WatchlistItem[]): Holding[] {
  const holdings: Holding[] = [];
  for (const item of items) {
    // The backend guarantees these move together, but narrowing both keeps
    // this honest if that ever changes.
    if (item.shares === null || item.costBasis === null) continue;
    holdings.push({ item, shares: item.shares, costBasis: item.costBasis });
  }
  return holdings;
}

export function valueHolding(holding: Holding, prices: Record<string, PriceState>): HoldingValue {
  const price = prices[holding.item.symbol]?.price;
  const cost = holding.shares * holding.costBasis;
  const marketValue = price === undefined ? undefined : holding.shares * price;
  const gain = marketValue === undefined ? undefined : marketValue - cost;
  // Guard the divide: a zero cost basis is rejected server-side, but a
  // division by zero here would render "Infinity%" rather than fail loudly.
  const gainPercent = gain === undefined || cost === 0 ? undefined : (gain / cost) * 100;

  return { ...holding, price, cost, marketValue, gain, gainPercent };
}

export interface PortfolioTotals {
  cost: number;
  /** Undefined until every holding has a price - a partial sum would understate the total. */
  marketValue: number | undefined;
  gain: number | undefined;
  gainPercent: number | undefined;
}

export function portfolioTotals(valued: HoldingValue[]): PortfolioTotals {
  const cost = valued.reduce((sum, h) => sum + h.cost, 0);
  const priced = valued.every((h) => h.marketValue !== undefined);
  const marketValue = priced ? valued.reduce((sum, h) => sum + (h.marketValue ?? 0), 0) : undefined;
  const gain = marketValue === undefined ? undefined : marketValue - cost;
  const gainPercent = gain === undefined || cost === 0 ? undefined : (gain / cost) * 100;

  return { cost, marketValue, gain, gainPercent };
}
