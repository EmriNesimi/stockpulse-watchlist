-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailVerifiedAt" TIMESTAMP(3),
    "verificationToken" TEXT,
    "verificationTokenExpires" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchlistId" TEXT NOT NULL,
    "shares" DOUBLE PRECISION,
    "costBasis" DOUBLE PRECISION,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredAt" TIMESTAMP(3),
    "watchlistId" TEXT NOT NULL,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_key" ON "Watchlist"("userId");

-- CreateIndex
CREATE INDEX "WatchlistItem_watchlistId_idx" ON "WatchlistItem"("watchlistId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_watchlistId_symbol_key" ON "WatchlistItem"("watchlistId", "symbol");

-- CreateIndex
CREATE INDEX "PriceAlert_watchlistId_idx" ON "PriceAlert"("watchlistId");

-- CreateIndex
CREATE INDEX "PriceAlert_symbol_idx" ON "PriceAlert"("symbol");

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

