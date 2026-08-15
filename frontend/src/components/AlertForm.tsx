import { useState } from "react";
import { X } from "@phosphor-icons/react";
import styles from "./AlertForm.module.css";

// Mirrors MAX_THRESHOLD in backend/src/routes/alerts.schemas.ts - keeping
// this in sync means a too-large value gets caught here instead of round-
// tripping to the server just to bounce off the same cap.
const MAX_THRESHOLD = 10_000_000;

interface AlertFormProps {
  symbol: string;
  defaultThreshold?: number;
  onSubmit: (threshold: number, direction: "above" | "below") => void;
  onCancel: () => void;
}

export default function AlertForm({ symbol, defaultThreshold, onSubmit, onCancel }: AlertFormProps) {
  const [threshold, setThreshold] = useState(defaultThreshold ? String(defaultThreshold) : "");
  const [direction, setDirection] = useState<"above" | "below">("above");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(threshold);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_THRESHOLD) return;
    onSubmit(parsed, direction);
  }

  return (
    <form onSubmit={handleSubmit} aria-label={`Set a price alert for ${symbol}`} className={styles.form}>
      <span className={styles.label}>Alert when</span>
      <select
        value={direction}
        onChange={(e) => setDirection(e.target.value as "above" | "below")}
        aria-label="Alert direction"
        className={styles.select}
      >
        <option value="above">above</option>
        <option value="below">below</option>
      </select>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0.01"
        max={MAX_THRESHOLD}
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
        placeholder="200.00"
        aria-label={`Price threshold for ${symbol} alert`}
        className={`tabular-nums ${styles.input}`}
      />
      <button type="submit" className={styles.submitButton}>
        Set
      </button>
      <button type="button" onClick={onCancel} aria-label="Cancel setting alert" className={styles.cancelButton}>
        <X size={16} aria-hidden />
      </button>
    </form>
  );
}
