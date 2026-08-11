import { WarningCircle, X } from "@phosphor-icons/react";
import type { ErrorToastEvent } from "../hooks/useErrorToasts";
import styles from "./ErrorToast.module.css";

interface ErrorToastProps {
  errors: ErrorToastEvent[];
  onDismiss: (id: string) => void;
}

export default function ErrorToast({ errors, onDismiss }: ErrorToastProps) {
  if (errors.length === 0) return null;

  return (
    <div role="log" aria-label="Error notifications" className={styles.container}>
      {errors.map((error) => (
        <div key={error.id} role="alert" className={styles.toast}>
          <WarningCircle size={18} weight="fill" aria-hidden className={styles.icon} />
          <div className={styles.body}>{error.message}</div>
          <button
            onClick={() => onDismiss(error.id)}
            aria-label={`Dismiss error: ${error.message}`}
            className={styles.dismissButton}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
