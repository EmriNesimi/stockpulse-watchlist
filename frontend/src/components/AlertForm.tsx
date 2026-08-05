import { useState } from "react";
import { X } from "@phosphor-icons/react";

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
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onSubmit(parsed, direction);
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={`Set a price alert for ${symbol}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-2)",
        background: "var(--color-muted)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <span style={{ fontSize: "0.8125rem", opacity: 0.7 }}>Alert when</span>
      <select
        value={direction}
        onChange={(e) => setDirection(e.target.value as "above" | "below")}
        aria-label="Alert direction"
        style={{
          background: "var(--color-secondary)",
          color: "var(--color-foreground)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-1) var(--space-2)",
          minHeight: 44,
        }}
      >
        <option value="above">above</option>
        <option value="below">below</option>
      </select>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0.01"
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
        placeholder="200.00"
        aria-label={`Price threshold for ${symbol} alert`}
        className="tabular-nums"
        style={{
          width: "5rem",
          background: "var(--color-secondary)",
          color: "var(--color-foreground)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-1) var(--space-2)",
          minHeight: 44,
        }}
      />
      <button
        type="submit"
        style={{
          background: "var(--color-accent)",
          color: "var(--color-on-primary)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-1) var(--space-3)",
          minHeight: 44,
          fontWeight: 500,
        }}
      >
        Set
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel setting alert"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 44,
          minHeight: 44,
          background: "transparent",
          border: "none",
          color: "var(--color-foreground)",
          opacity: 0.6,
        }}
      >
        <X size={16} aria-hidden />
      </button>
    </form>
  );
}
