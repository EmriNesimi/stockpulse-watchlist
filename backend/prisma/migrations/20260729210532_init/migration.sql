-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default-user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchlistId" TEXT NOT NULL,
    CONSTRAINT "WatchlistItem_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_key" ON "Watchlist"("userId");

-- CreateIndex
CREATE INDEX "WatchlistItem_watchlistId_idx" ON "WatchlistItem"("watchlistId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_watchlistId_symbol_key" ON "WatchlistItem"("watchlistId", "symbol");
