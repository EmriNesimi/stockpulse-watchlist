import type { PriceDirection } from "../lib/format";

interface SparklineProps {
  values: number[];
  /**
   * Taken from priceDirection, not derived here, so the line agrees with the
   * percentage and the arrow beside it. "flat" is a real case: a boolean
   * forced a flat series to be described as trending one way or the other,
   * and it announced "trending up" next to a percentage reading 0.00%.
   */
  direction: PriceDirection;
}

const WIDTH = 96;
const HEIGHT = 32;

export default function Sparkline({ values, direction }: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg width={WIDTH} height={HEIGHT} role="img" aria-label="Not enough price history yet">
        <line
          x1={0}
          y1={HEIGHT / 2}
          x2={WIDTH}
          y2={HEIGHT / 2}
          stroke="var(--color-border)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * WIDTH;
      const y = HEIGHT - ((value - min) / range) * HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const color =
    direction === "down" ? "var(--color-bearish)" : "var(--color-bullish)";

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={`Recent price trend, ${
        direction === "flat" ? "not moving" : direction === "up" ? "trending up" : "trending down"
      }`}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
