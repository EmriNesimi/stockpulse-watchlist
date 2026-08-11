import { useEffect, useRef, useState } from "react";
import type { PriceState } from "../types";
import styles from "./PriceCell.module.css";

interface PriceCellProps {
  state?: PriceState;
}

// Briefly flashes the cell's background on a price change. Color is never
// the only signal (WatchlistTable already pairs it with an up/down icon in
// the adjacent column) — this is just a supporting cue, and it's disabled
// entirely under prefers-reduced-motion via the global rule in index.css.
export default function PriceCell({ state }: PriceCellProps) {
  const previousPrice = useRef<number | undefined>(state?.price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (state === undefined) return;
    const prev = previousPrice.current;
    if (prev !== undefined && state.price !== prev) {
      setFlash(state.price > prev ? "up" : "down");
      const timer = setTimeout(() => setFlash(null), 500);
      previousPrice.current = state.price;
      return () => clearTimeout(timer);
    }
    previousPrice.current = state.price;
  }, [state?.price]);

  const flashClass = flash === "up" ? styles.flashUp : flash === "down" ? styles.flashDown : "";

  return (
    <div className={`tabular-nums ${styles.cell} ${flashClass}`}>
      {state ? `$${state.price.toFixed(2)}` : "—"}
      {state && (
        <span
          title={
            state.source === "live"
              ? "Streaming real trades from Massive"
              : "Simulated — no real-time Massive entitlement configured"
          }
          className={`${styles.badge} ${state.source === "live" ? styles.live : ""}`}
        >
          {state.source === "live" ? "LIVE" : "SIM"}
        </span>
      )}
    </div>
  );
}
