import { SimulatedFeed } from "./SimulatedFeed";
import type { PriceFeed } from "./PriceFeed";

// TODO(next commit): branch on env.polygonApiKey and return PolygonLiveFeed
// when a real key with WS entitlement is available. Simulated is the only
// implementation for now.
export function createPriceFeed(): PriceFeed {
  return new SimulatedFeed();
}

export type { PriceFeed, PriceTick, Unsubscribe } from "./PriceFeed";
