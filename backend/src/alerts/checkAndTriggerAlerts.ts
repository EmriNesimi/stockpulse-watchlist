import { prisma } from "../db";
import { logger } from "../logger";
import type { PriceTick } from "../priceFeed";

export interface AlertTrigger {
  id: string;
  symbol: string;
  threshold: number;
  direction: "above" | "below";
  price: number;
  triggeredAt: string;
  // Whoever's watchlist this alert belongs to - the broadcaster uses this
  // to deliver the alert only to that user's own connection(s), not to
  // every client subscribed to the symbol.
  userId: string;
}

/**
 * Checks every still-active alert for this tick's symbol and fires (marks
 * triggered + returns) any whose threshold the current price has reached.
 * One-shot: once triggered, an alert never fires again on its own — the
 * user has to remove and re-add it if they want to watch that level again.
 *
 * `onTriggered` is called as each alert is claimed rather than after the whole
 * batch. Collecting them and returning meant a database error partway through
 * rejected the promise and threw away the ones already written — they were
 * marked triggered in Postgres, could never fire again, and the user was never
 * told. Notifying per alert keeps the durable write and the notification
 * together.
 */
export async function checkAndTriggerAlerts(
  tick: PriceTick,
  onTriggered?: (alert: AlertTrigger) => void
): Promise<AlertTrigger[]> {
  // select rather than include: this runs on every tick for every subscribed
  // symbol — roughly one query per symbol per 1.5s — and the only thing needed
  // off the watchlist is which user owns it. include pulled the whole row.
  const candidates = await prisma.priceAlert.findMany({
    where: { symbol: tick.symbol, triggeredAt: null },
    select: {
      id: true,
      symbol: true,
      threshold: true,
      direction: true,
      watchlist: { select: { userId: true } },
    },
  });
  if (candidates.length === 0) return [];

  const triggered: AlertTrigger[] = [];

  for (const alert of candidates) {
    const crossed =
      alert.direction === "above" ? tick.price >= alert.threshold : tick.price <= alert.threshold;
    if (!crossed) continue;

    const triggeredAt = new Date();

    // updateMany with triggeredAt: null in the where clause, so the database
    // decides who wins. The read above and this write are not atomic, and ticks
    // are dispatched without awaiting the previous one — two trades for the
    // same symbol milliseconds apart could both see the alert untriggered and
    // both fire it, which breaks the one-shot promise in the doc comment.
    const claimed = await prisma.priceAlert.updateMany({
      where: { id: alert.id, triggeredAt: null },
      data: { triggeredAt },
    });

    // Someone else got there first. Theirs is the one that notifies.
    if (claimed.count === 0) continue;

    const entry: AlertTrigger = {
      id: alert.id,
      symbol: alert.symbol,
      threshold: alert.threshold,
      direction: alert.direction as "above" | "below",
      price: tick.price,
      triggeredAt: triggeredAt.toISOString(),
      userId: alert.watchlist.userId,
    };

    triggered.push(entry);

    // Guarded because the alert is already durably claimed at this point. If
    // delivery throws, this one is lost either way — but letting it escape
    // would abort the loop before the *remaining* alerts are claimed and
    // reject the promise, which is the failure the per-alert design exists to
    // avoid. One bad delivery, not a batch.
    try {
      onTriggered?.(entry);
    } catch (err) {
      logger.error("failed to deliver a triggered alert", { alertId: entry.id, symbol: entry.symbol, err });
    }
  }

  return triggered;
}
