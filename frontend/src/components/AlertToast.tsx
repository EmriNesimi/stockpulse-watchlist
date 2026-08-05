import { Bell, X, TrendUp, TrendDown } from "@phosphor-icons/react";
import type { AlertEvent } from "../hooks/useLiveTicks";

interface AlertToastProps {
  alerts: AlertEvent[];
  onDismiss: (id: string) => void;
}

export default function AlertToast({ alerts, onDismiss }: AlertToastProps) {
  if (alerts.length === 0) return null;

  return (
    <div
      role="log"
      aria-label="Price alert notifications"
      style={{
        position: "fixed",
        top: "var(--space-5)",
        right: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        zIndex: 100,
        maxWidth: "20rem",
      }}
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-2)",
            padding: "var(--space-3)",
            background: "var(--color-secondary)",
            border: `1px solid ${alert.direction === "above" ? "var(--color-bullish)" : "var(--color-bearish)"}`,
            borderRadius: "var(--radius-md)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            animation: "fadeIn var(--motion-base) var(--motion-ease)",
          }}
        >
          <Bell
            size={18}
            weight="fill"
            aria-hidden
            style={{ color: alert.direction === "above" ? "var(--color-bullish)" : "var(--color-bearish)", flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ flex: 1, fontSize: "0.875rem" }}>
            <strong className="tabular-nums">{alert.symbol}</strong> crossed{" "}
            {alert.direction === "above" ? (
              <TrendUp size={14} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} />
            ) : (
              <TrendDown size={14} aria-hidden style={{ display: "inline", verticalAlign: "-2px" }} />
            )}{" "}
            <span className="tabular-nums">${alert.threshold.toFixed(2)}</span> — now at{" "}
            <span className="tabular-nums">${alert.price.toFixed(2)}</span>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            aria-label={`Dismiss ${alert.symbol} alert`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              minHeight: 32,
              background: "transparent",
              border: "none",
              color: "var(--color-foreground)",
              opacity: 0.6,
              flexShrink: 0,
            }}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
