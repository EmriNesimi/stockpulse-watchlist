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
// Floor on the vertical range, as a fraction of the price: 0.1%. Below this a
// move is noise, and drawing it full-height says something the data doesn't.
const MIN_RANGE_RATIO = 0.001;

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
  // Scaling to the observed spread means any spread fills the plot, however
  // small. A hundredth of a cent on a $300 stock was drawn across the full
  // 176px — a stock that didn't move, rendered as violent volatility.
  //
  // So the range has a floor proportional to the price, and the series is
  // centred in whatever range wins. A genuinely flat series falls out of the
  // same arithmetic (it lands mid-plot), which is why there's no longer a
  // separate branch for it.
  const spread = high - low;
  const mid = (high + low) / 2;
  const range = Math.max(spread, Math.abs(mid) * MIN_RANGE_RATIO) || 1;
  // Anchor the scale on the midpoint, not on `low` — otherwise widening the
  // range would push the series to the bottom of the widened band.
  const base = mid - range / 2;
  const usableHeight = HEIGHT - PADDING_Y * 2;
  const candleWidth = WIDTH / candles.length;
  // Capped as well as floored. Without the cap a single candle gets the whole
  // 640px slot and renders a 384px slab with a thin wick poking out of it —
  // arithmetically right, and it reads as a broken chart. The cap only binds
  // below about 27 candles; above that the 0.6 ratio is still what decides.
  const bodyWidth = Math.min(Math.max(1, candleWidth * 0.6), MAX_BODY_WIDTH);

  function y(value: number): number {
    return PADDING_Y + usableHeight - ((value - base) / range) * usableHeight;
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
