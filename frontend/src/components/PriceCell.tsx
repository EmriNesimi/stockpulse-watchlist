import { useEffect, useRef, useState } from "react";
import type { PriceState } from "../types";

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

  return (
    <div
      className="tabular-nums"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "2px var(--space-2)",
        margin: "-2px calc(var(--space-2) * -1)",
        borderRadius: "var(--radius-sm)",
        transition: "background-color 500ms ease-out",
        backgroundColor:
          flash === "up"
            ? "color-mix(in srgb, var(--color-bullish) 25%, transparent)"
            : flash === "down"
              ? "color-mix(in srgb, var(--color-bearish) 25%, transparent)"
              : "transparent",
      }}
    >
      {state ? `$${state.price.toFixed(2)}` : "—"}
      {state && (
        <span
          title={
            state.source === "live"
              ? "Streaming real trades from Massive"
              : "Simulated — no real-time Massive entitlement configured"
          }
          style={{
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.02em",
            padding: "1px 6px",
            borderRadius: "var(--radius-sm)",
            color: state.source === "live" ? "var(--color-bullish)" : "var(--color-foreground)",
            border: `1px solid ${state.source === "live" ? "var(--color-bullish)" : "var(--color-border)"}`,
            opacity: state.source === "live" ? 1 : 0.6,
          }}
        >
          {state.source === "live" ? "LIVE" : "SIM"}
        </span>
      )}
    </div>
  );
}
