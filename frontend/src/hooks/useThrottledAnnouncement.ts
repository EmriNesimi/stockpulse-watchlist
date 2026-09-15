import { useEffect, useRef, useState } from "react";
import { formatCurrency, signedDirection } from "../lib/format";
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
        // "unchanged" rather than "up 0.00%": the sighted UI stopped signing a
        // rounded-away move, and reading "up nought point nought nought
        // percent" aloud is worse than either. signedDirection shares the
        // visible arrow's threshold, so the spoken and drawn directions agree.
        const direction = signedDirection(state.changePercent);
        const movement =
          direction === "flat" ? "unchanged" : `${direction} ${Math.abs(state.changePercent).toFixed(2)}%`;
        return `${item.symbol} ${formatCurrency(state.price)}, ${movement}`;
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
