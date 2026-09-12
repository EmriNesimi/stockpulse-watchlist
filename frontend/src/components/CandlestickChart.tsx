import { formatCurrency } from "../lib/format";
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
const MAX_BODY_WIDTH = 24;

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
  // A series where nothing moved has no range to scale against. The || 1
  // kept the divide safe but not the result: (value - low) is 0 for every
  // point, so y collapsed to the bottom of the plot area and a flat day
  // rendered as lines sitting on the border, which reads as clipping rather
  // than as "the price didn't move".
  const spread = high - low;
  const flat = spread === 0;
  const range = spread || 1;
  const usableHeight = HEIGHT - PADDING_Y * 2;
  const candleWidth = WIDTH / candles.length;
  // Capped as well as floored. Without the cap a single candle gets the whole
  // 640px slot and renders a 384px slab with a thin wick poking out of it —
  // arithmetically right, and it reads as a broken chart. The cap only binds
  // below about 27 candles; above that the 0.6 ratio is still what decides.
  const bodyWidth = Math.min(Math.max(1, candleWidth * 0.6), MAX_BODY_WIDTH);

  function y(value: number): number {
    if (flat) return PADDING_Y + usableHeight / 2;
    return PADDING_Y + usableHeight - ((value - low) / range) * usableHeight;
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Candlestick chart of ${candles.length} days of price history, from ${formatCurrency(low)} to ${formatCurrency(high)}`}
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
