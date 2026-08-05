import { prisma } from "../db";
import type { PriceTick } from "../priceFeed";

export interface AlertTrigger {
  id: string;
  symbol: string;
  threshold: number;
  direction: "above" | "below";
  price: number;
  triggeredAt: string;
}

/**
 * Checks every still-active alert for this tick's symbol and fires (marks
 * triggered + returns) any whose threshold the current price has reached.
 * One-shot: once triggered, an alert never fires again on its own — the
 * user has to remove and re-add it if they want to watch that level again.
 */
export async function checkAndTriggerAlerts(tick: PriceTick): Promise<AlertTrigger[]> {
  const candidates = await prisma.priceAlert.findMany({
    where: { symbol: tick.symbol, triggeredAt: null },
  });
  if (candidates.length === 0) return [];

  const triggered: AlertTrigger[] = [];

  for (const alert of candidates) {
    const crossed =
      alert.direction === "above" ? tick.price >= alert.threshold : tick.price <= alert.threshold;
    if (!crossed) continue;

    const triggeredAt = new Date();
    await prisma.priceAlert.update({ where: { id: alert.id }, data: { triggeredAt } });

    triggered.push({
      id: alert.id,
      symbol: alert.symbol,
      threshold: alert.threshold,
      direction: alert.direction as "above" | "below",
      price: tick.price,
      triggeredAt: triggeredAt.toISOString(),
    });
  }

  return triggered;
}
