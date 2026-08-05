-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "threshold" REAL NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredAt" DATETIME,
    "watchlistId" TEXT NOT NULL,
    CONSTRAINT "PriceAlert_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PriceAlert_watchlistId_idx" ON "PriceAlert"("watchlistId");

-- CreateIndex
CREATE INDEX "PriceAlert_symbol_idx" ON "PriceAlert"("symbol");
