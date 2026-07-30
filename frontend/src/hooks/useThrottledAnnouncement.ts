import { useEffect, useRef, useState } from "react";
import type { WatchlistItem } from "../lib/api";
import type { PriceState } from "../types";

const THROTTLE_MS = 8000;

// Ticks arrive every ~1.5s per symbol — announcing every single one to
// screen reader users would be unusable noise, so this only pushes an
// updated summary to the aria-live region at most once every 8s.
export function useThrottledAnnouncement(items: WatchlistItem[], prices: Record<string, PriceState>) {
  const [announcement, setAnnouncement] = useState("");
  const lastAnnouncedAt = useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastAnnouncedAt.current < THROTTLE_MS) return;
    if (items.length === 0) return;

    const summary = items
      .map((item) => {
        const state = prices[item.symbol];
        if (!state) return null;
        const direction = state.changePercent >= 0 ? "up" : "down";
        return `${item.symbol} $${state.price.toFixed(2)}, ${direction} ${Math.abs(state.changePercent).toFixed(2)}%`;
      })
      .filter(Boolean)
      .join(". ");

    if (summary) {
      lastAnnouncedAt.current = now;
      setAnnouncement(summary);
    }
    // Re-checked on every price tick, but gated by the throttle above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);

  return announcement;
}
