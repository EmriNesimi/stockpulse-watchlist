import { WifiHigh, WifiSlash, ArrowsClockwise } from "@phosphor-icons/react";
import type { ConnectionStatus } from "../hooks/useLiveTicks";
import styles from "./ConnectionBadge.module.css";

const COPY: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  open: "Connected",
  reconnecting: "Reconnecting…",
  closed: "Disconnected",
};

export default function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const Icon = status === "open" ? WifiHigh : status === "reconnecting" ? ArrowsClockwise : WifiSlash;

  return (
    <span role="status" className={`${styles.badge} ${status === "open" ? styles.connected : ""}`}>
      <Icon size={14} aria-hidden className={status === "reconnecting" ? "spin" : undefined} />
      {COPY[status]}
    </span>
  );
}
