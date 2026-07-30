interface SparklineProps {
  values: number[];
  bullish: boolean;
}

const WIDTH = 96;
const HEIGHT = 32;

export default function Sparkline({ values, bullish }: SparklineProps) {
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

  const color = bullish ? "var(--color-bullish)" : "var(--color-bearish)";

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={`Recent price trend, ${bullish ? "trending up" : "trending down"}`}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
