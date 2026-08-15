// Mirrors MAX_SYMBOLS_PER_CLIENT in backend/src/wsLimits.ts - a single WS
// connection can only ever subscribe to this many symbols, so the backend
// rejects adding a 31st watchlist item. Duplicated here (not shared via a
// package, frontend/backend are separate TS projects) so the UI can warn
// before hitting the server, same pattern as AlertForm's MAX_THRESHOLD.
export const MAX_WATCHLIST_SYMBOLS = 30;
