import { env } from "../env";
import { SimulatedFeed } from "./SimulatedFeed";
import { PolygonLiveFeed } from "./PolygonLiveFeed";
import type { PriceFeed } from "./PriceFeed";

// PolygonLiveFeed handles its own graceful fallback to simulated data if the
// key turns out invalid or lacks real-time stocks entitlement (the free
// tier doesn't include it) — so it's always safe to construct.
export function createPriceFeed(): PriceFeed {
  return env.polygonApiKey ? new PolygonLiveFeed() : new SimulatedFeed();
}

export type { PriceFeed, PriceTick, Unsubscribe } from "./PriceFeed";
