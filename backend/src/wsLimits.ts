// A WS connection can only subscribe to this many symbols at once (see
// clientMessageSchema in ws/broadcaster.ts) - shared here so the watchlist
// route can cap watchlist size at the same number. Without that cap, a
// user could add more tickers than a single WS connection can ever
// subscribe to, and the entire subscribe message - not just the extras -
// gets rejected by the broadcaster, silently breaking live prices for
// their whole watchlist.
export const MAX_SYMBOLS_PER_CLIENT = 30;
