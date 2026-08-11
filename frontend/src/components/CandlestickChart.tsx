import type { Candle } from "../lib/api";
import styles from "./CandlestickChart.module.css";

interface CandlestickChartProps {
  candles: Candle[];
  loading: boolean;
  error: string | null;
}

const WIDTH = 640;
const HEIGHT = 200;
const PADDING_Y = 12;

export default function CandlestickChart({ candles, loading, error }: CandlestickChartProps) {
  if (loading) {
    return (
      <div role="status" className={styles.status}>
        Loading chart…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className={styles.error}>
        Couldn't load price history: {error}
      </div>
    );
  }

  if (candles.length === 0) {
    return <div className={styles.status}>No price history available yet.</div>;
  }

  const low = Math.min(...candles.map((c) => c.low));
  const high = Math.max(...candles.map((c) => c.high));
  const range = high - low || 1;
  const usableHeight = HEIGHT - PADDING_Y * 2;
  const candleWidth = WIDTH / candles.length;
  const bodyWidth = Math.max(1, candleWidth * 0.6);

  function y(value: number): number {
    return PADDING_Y + usableHeight - ((value - low) / range) * usableHeight;
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Candlestick chart of ${candles.length} days of price history, from $${low.toFixed(2)} to $${high.toFixed(2)}`}
    >
      {candles.map((candle, i) => {
        const bullish = candle.close >= candle.open;
        const colorClass = bullish ? styles.bullish : styles.bearish;
        const cx = i * candleWidth + candleWidth / 2;
        const bodyTop = y(Math.max(candle.open, candle.close));
        const bodyBottom = y(Math.min(candle.open, candle.close));

        return (
          <g key={candle.time} className={colorClass}>
            <line x1={cx} x2={cx} y1={y(candle.high)} y2={y(candle.low)} strokeWidth={1} />
            <rect x={cx - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={Math.max(1, bodyBottom - bodyTop)} />
          </g>
        );
      })}
    </svg>
  );
}
