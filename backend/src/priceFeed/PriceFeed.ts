export interface PriceTick {
  symbol: string;
  price: number;
  changePercent: number;
  timestamp: number;
  source: "live" | "simulated";
}

export type Unsubscribe = () => void;

// Both the simulated engine and the real Polygon WS feed implement this, so
// the rest of the app (WS broadcaster, routes) never has to care which one
// is actually running underneath.
export interface PriceFeed {
  subscribe(symbol: string, onTick: (tick: PriceTick) => void): Unsubscribe;
}
