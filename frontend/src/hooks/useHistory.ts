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
