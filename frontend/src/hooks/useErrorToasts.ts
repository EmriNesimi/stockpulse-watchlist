import { useCallback, useRef, useState } from "react";

export interface ErrorToastEvent {
  id: string;
  message: string;
}

const AUTO_DISMISS_MS = 6000;

export function useErrorToasts() {
  const [errors, setErrors] = useState<ErrorToastEvent[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Both are wrapped so their identity is genuinely stable across renders.
  // Callers depend on that: Dashboard omits pushError from two effects'
  // dependency arrays on exactly this basis, and that justification has to be
  // true rather than merely harmless.
  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushError = useCallback(
    (message: string) => {
      const id = crypto.randomUUID();
      setErrors((prev) => [...prev, { id, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismissError(id), AUTO_DISMISS_MS)
      );
    },
    [dismissError]
  );

  return { errors, pushError, dismissError };
}
