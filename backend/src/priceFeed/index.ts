import { env } from "../env";
import { SimulatedFeed } from "./SimulatedFeed";
import { MassiveLiveFeed } from "./MassiveLiveFeed";
import type { PriceFeed } from "./PriceFeed";

// MassiveLiveFeed handles its own graceful fallback to simulated data if the
// key turns out invalid or lacks real-time stocks entitlement (the free
// tier doesn't include it) — so it's always safe to construct.
export function createPriceFeed(): PriceFeed {
  return env.massiveApiKey ? new MassiveLiveFeed() : new SimulatedFeed();
}

export type { PriceFeed, PriceTick, Unsubscribe } from "./PriceFeed";
