import { Bell, X, TrendUp, TrendDown } from "@phosphor-icons/react";
import type { AlertEvent } from "../lib/wsMessages";
import styles from "./AlertToast.module.css";

interface AlertToastProps {
  alerts: AlertEvent[];
  onDismiss: (id: string) => void;
}

export default function AlertToast({ alerts, onDismiss }: AlertToastProps) {
  if (alerts.length === 0) return null;

  return (
    <div role="log" aria-label="Price alert notifications" className={styles.container}>
      {alerts.map((alert) => {
        const directionClass = alert.direction === "above" ? styles.above : styles.below;
        const iconDirectionClass = alert.direction === "above" ? styles.iconAbove : styles.iconBelow;

        return (
          <div key={alert.id} role="alert" className={`${styles.toast} ${directionClass}`}>
            <Bell size={18} weight="fill" aria-hidden className={`${styles.icon} ${iconDirectionClass}`} />
            <div className={styles.body}>
              <strong className="tabular-nums">{alert.symbol}</strong> crossed{" "}
              {alert.direction === "above" ? (
                <TrendUp size={14} aria-hidden className={styles.trendIcon} />
              ) : (
                <TrendDown size={14} aria-hidden className={styles.trendIcon} />
              )}{" "}
              <span className="tabular-nums">${alert.threshold.toFixed(2)}</span> — now at{" "}
              <span className="tabular-nums">${alert.price.toFixed(2)}</span>
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              aria-label={`Dismiss ${alert.symbol} alert`}
              className={styles.dismissButton}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
