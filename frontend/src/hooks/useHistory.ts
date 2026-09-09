import { useEffect, useState } from "react";
import { getHistory, type Candle } from "../lib/api";

interface UseHistoryResult {
  candles: Candle[];
  loading: boolean;
  error: string | null;
}

// symbol === null means "don't fetch" (e.g. the chart row isn't expanded).
export function useHistory(symbol: string | null, days = 30): UseHistoryResult {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setCandles([]);
      setError(null);
      // A request already in flight is abandoned by the previous cleanup, so
      // its .finally never clears this. Without the reset the hook reports
      // loading forever once the symbol goes away mid-fetch.
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getHistory(symbol, days)
      .then(({ candles }) => {
        if (!cancelled) setCandles(candles);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load price history");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, days]);

  return { candles, loading, error };
}
