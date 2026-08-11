import { WarningCircle, X } from "@phosphor-icons/react";
import type { ErrorToastEvent } from "../hooks/useErrorToasts";

interface ErrorToastProps {
  errors: ErrorToastEvent[];
  onDismiss: (id: string) => void;
}

export default function ErrorToast({ errors, onDismiss }: ErrorToastProps) {
  if (errors.length === 0) return null;

  return (
    <div
      role="log"
      aria-label="Error notifications"
      style={{
        position: "fixed",
        top: "var(--space-5)",
        left: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        zIndex: 100,
        maxWidth: "20rem",
      }}
    >
      {errors.map((error) => (
        <div
          key={error.id}
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-2)",
            padding: "var(--space-3)",
            background: "var(--color-secondary)",
            border: "1px solid var(--color-bearish)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            animation: "fadeIn var(--motion-base) var(--motion-ease)",
          }}
        >
          <WarningCircle
            size={18}
            weight="fill"
            aria-hidden
            style={{ color: "var(--color-bearish)", flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ flex: 1, fontSize: "0.875rem" }}>{error.message}</div>
          <button
            onClick={() => onDismiss(error.id)}
            aria-label="Dismiss error"
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
