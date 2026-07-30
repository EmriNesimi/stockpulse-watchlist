import { WifiHigh, WifiSlash, ArrowsClockwise } from "@phosphor-icons/react";
import type { ConnectionStatus } from "../hooks/useLiveTicks";

const COPY: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  open: "Connected",
  reconnecting: "Reconnecting…",
  closed: "Disconnected",
};

export default function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const Icon = status === "open" ? WifiHigh : status === "reconnecting" ? ArrowsClockwise : WifiSlash;

  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        fontSize: "0.8125rem",
        padding: "var(--space-1) var(--space-2)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--color-border)",
        color: status === "open" ? "var(--color-bullish)" : "var(--color-foreground)",
        opacity: status === "open" ? 1 : 0.75,
      }}
    >
      <Icon
        size={14}
        aria-hidden
        className={status === "reconnecting" ? "spin" : undefined}
      />
      {COPY[status]}
    </span>
  );
}
