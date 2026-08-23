import { useState } from "react";
import type { WatchlistItem } from "../lib/api";
import styles from "./HoldingsForm.module.css";

// Mirrors the ceilings in backend/src/routes/watchlist.schemas.ts so a typo
// is caught here rather than round-tripping just to bounce off the same cap.
const MAX_SHARES = 1_000_000_000;
const MAX_COST_BASIS = 10_000_000;

interface HoldingsFormProps {
  item: WatchlistItem;
  onSave: (shares: number, costBasis: number) => Promise<void>;
  onClear: () => Promise<void>;
  onCancel: () => void;
}

function parsePositive(raw: string, max: number): number | null {
  const value = Number(raw.trim());
  if (raw.trim() === "" || !Number.isFinite(value) || value <= 0 || value > max) return null;
  return value;
}

export default function HoldingsForm({ item, onSave, onClear, onCancel }: HoldingsFormProps) {
  const [shares, setShares] = useState(item.shares === null ? "" : String(item.shares));
  const [costBasis, setCostBasis] = useState(item.costBasis === null ? "" : String(item.costBasis));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasPosition = item.shares !== null && item.costBasis !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedShares = parsePositive(shares, MAX_SHARES);
    const parsedCost = parsePositive(costBasis, MAX_COST_BASIS);

    // The backend requires both together, so don't let a half-filled form
    // leave and come back as a validation error.
    if (parsedShares === null || parsedCost === null) {
      setError("Enter a share count and a cost basis — both need a positive number.");
      return;
    }

    setBusy(true);
    try {
      await onSave(parsedShares, parsedCost);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save those holdings — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setError(null);
    setBusy(true);
    try {
      await onClear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't clear those holdings — try again.");
    } finally {
      setBusy(false);
    }
  }

  const invalid = error !== null;

  return (
    <form onSubmit={handleSubmit} aria-label={`Holdings for ${item.symbol}`} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor={`shares-${item.id}`} className={styles.label}>
          Shares
        </label>
        <input
          id={`shares-${item.id}`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          max={MAX_SHARES}
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="10"
          aria-invalid={invalid}
          aria-describedby={invalid ? "holdings-error" : undefined}
          className={`tabular-nums ${styles.input} ${invalid ? styles.inputInvalid : ""}`}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`cost-${item.id}`} className={styles.label}>
          Cost per share
        </label>
        <input
          id={`cost-${item.id}`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          max={MAX_COST_BASIS}
          value={costBasis}
          onChange={(e) => setCostBasis(e.target.value)}
          placeholder="150.00"
          aria-invalid={invalid}
          aria-describedby={invalid ? "holdings-error" : undefined}
          className={`tabular-nums ${styles.input} ${invalid ? styles.inputInvalid : ""}`}
        />
      </div>

      <div className={styles.actions}>
        {hasPosition && (
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            className={`${styles.textButton} ${styles.clearButton}`}
          >
            Clear
          </button>
        )}
        <button type="button" onClick={onCancel} disabled={busy} className={styles.textButton}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={styles.saveButton}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      {error && (
        <p id="holdings-error" role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
