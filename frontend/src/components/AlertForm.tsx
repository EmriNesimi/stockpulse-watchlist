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
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(threshold);
    // Rejecting these was always right. Rejecting them silently made Set look
    // like a broken button — the same value stays in the field, no alert is
    // created, and nothing says which of the two happened.
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_THRESHOLD) {
      setError(`Enter a price between $0.01 and $${MAX_THRESHOLD.toLocaleString("en-US")}.`);
      return;
    }
    setError(null);
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
        onChange={(e) => {
          setThreshold(e.target.value);
          // Clear on edit rather than on the next submit: leaving it up while
          // the user fixes the value contradicts what they're looking at.
          if (error) setError(null);
        }}
        placeholder="200.00"
        aria-label={`Price threshold for ${symbol} alert`}
        aria-invalid={error !== null}
        aria-describedby={error ? "alert-threshold-error" : undefined}
        className={`tabular-nums ${styles.input}`}
      />
      <button type="submit" className={styles.submitButton}>
        Set
      </button>
      <button type="button" onClick={onCancel} aria-label="Cancel setting alert" className={styles.cancelButton}>
        <X size={16} aria-hidden />
      </button>
      {error && (
        <div id="alert-threshold-error" role="alert" className={styles.error}>
          {error}
        </div>
      )}
    </form>
  );
}
