import { useRef, useState } from "react";

export interface ErrorToastEvent {
  id: string;
  message: string;
}

const AUTO_DISMISS_MS = 6000;

export function useErrorToasts() {
  const [errors, setErrors] = useState<ErrorToastEvent[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  function dismissError(id: string) {
    setErrors((prev) => prev.filter((e) => e.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }

  function pushError(message: string) {
    const id = crypto.randomUUID();
    setErrors((prev) => [...prev, { id, message }]);
    timers.current.set(
      id,
      setTimeout(() => dismissError(id), AUTO_DISMISS_MS)
    );
  }

  return { errors, pushError, dismissError };
}
