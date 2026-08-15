import { tickerAvatarHue } from "../lib/tickerColor";
import styles from "./TickerAvatar.module.css";

interface TickerAvatarProps {
  symbol: string;
  size?: number;
}

// First 1-2 letters of the symbol on a deterministic colored circle -
// there's no real logo data (Massive doesn't provide one), so this is the
// closest honest substitute rather than faking a logo we don't have.
export default function TickerAvatar({ symbol, size = 36 }: TickerAvatarProps) {
  const initials = symbol.replace(/[.-].*$/, "").slice(0, 2);

  return (
    <span
      className={styles.avatar}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: tickerAvatarHue(symbol),
      }}
    >
      {initials}
    </span>
  );
}
