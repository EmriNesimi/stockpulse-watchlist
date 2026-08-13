import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "../db";
import { getOrCreateWatchlist, DEFAULT_USER_ID } from "../watchlistHelper";
import { checkAndTriggerAlerts } from "./checkAndTriggerAlerts";
import type { PriceTick } from "../priceFeed";

function tick(overrides: Partial<PriceTick> = {}): PriceTick {
  return { symbol: "AAPL", price: 100, changePercent: 0, timestamp: Date.now(), source: "simulated", ...overrides };
}

async function createAlert(data: { symbol: string; threshold: number; direction: string }) {
  const watchlist = await getOrCreateWatchlist(DEFAULT_USER_ID);
  return prisma.priceAlert.create({ data: { ...data, watchlistId: watchlist.id } });
}

afterEach(async () => {
  await prisma.priceAlert.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.watchlist.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("checkAndTriggerAlerts", () => {
  it("returns nothing when there are no alerts for the symbol", async () => {
    const result = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 300 }));
    expect(result).toEqual([]);
  });

  it("fires an 'above' alert once the price reaches the threshold", async () => {
    const alert = await createAlert({ symbol: "AAPL", threshold: 200, direction: "above" });

    const result = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 200 }));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: alert.id, direction: "above", price: 200 });
  });

  it("doesn't fire an 'above' alert while the price is still under the threshold", async () => {
    await createAlert({ symbol: "AAPL", threshold: 200, direction: "above" });

    const result = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 199.99 }));

    expect(result).toEqual([]);
  });

  it("fires a 'below' alert once the price drops to the threshold", async () => {
    const alert = await createAlert({ symbol: "AAPL", threshold: 150, direction: "below" });

    const result = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 150 }));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: alert.id, direction: "below" });
  });

  it("doesn't fire a 'below' alert while the price is still above the threshold", async () => {
    await createAlert({ symbol: "AAPL", threshold: 150, direction: "below" });

    const result = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 150.01 }));

    expect(result).toEqual([]);
  });

  it("marks the alert as triggered in the database, not just in the return value", async () => {
    const alert = await createAlert({ symbol: "AAPL", threshold: 200, direction: "above" });

    await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 250 }));

    const stored = await prisma.priceAlert.findUniqueOrThrow({ where: { id: alert.id } });
    expect(stored.triggeredAt).not.toBeNull();
  });

  it("is one-shot: doesn't fire again on a later tick once already triggered", async () => {
    await createAlert({ symbol: "AAPL", threshold: 200, direction: "above" });

    const first = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 210 }));
    expect(first).toHaveLength(1);

    const second = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 220 }));
    expect(second).toEqual([]);
  });

  it("ignores alerts for other symbols", async () => {
    await createAlert({ symbol: "MSFT", threshold: 200, direction: "above" });

    const result = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 500 }));

    expect(result).toEqual([]);
  });

  it("evaluates multiple alerts on the same symbol independently", async () => {
    const above = await createAlert({ symbol: "AAPL", threshold: 200, direction: "above" });
    const below = await createAlert({ symbol: "AAPL", threshold: 190, direction: "below" });

    // Price sits between both thresholds — neither should fire.
    const untriggered = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 195 }));
    expect(untriggered).toEqual([]);

    const result = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 205 }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(above.id);

    const stillActive = await prisma.priceAlert.findUniqueOrThrow({ where: { id: below.id } });
    expect(stillActive.triggeredAt).toBeNull();
  });

  it("includes the owning user's id so the broadcaster can route the alert to just them", async () => {
    await createAlert({ symbol: "AAPL", threshold: 200, direction: "above" });

    const result = await checkAndTriggerAlerts(tick({ symbol: "AAPL", price: 210 }));

    expect(result[0].userId).toBe(DEFAULT_USER_ID);
  });
});
