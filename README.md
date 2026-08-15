<div align="center">

<img src="https://capsule-render.vercel.app/api?type=soft&color=0:020617,50:0F172A,100:16A34A&height=180&section=header&text=StockPulse&fontSize=54&fontColor=F8FAFC&fontAlignY=35&animation=fadeIn&desc=live%20tickers.%20a%20real%20watchlist.%20no%20fake%20data%20labeled%20as%20real.&descAlignY=58&descSize=16&descAlign=50" width="100%" alt="StockPulse banner" />

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=18&duration=2200&pause=800&color=00FF9C&background=02061700&center=true&vCenter=true&width=600&lines=%24+watching+AAPL...+%2B0.34%25;%24+watching+MSFT...+-0.12%25;%24+connection%3A+live" alt="Terminal-style typing animation" />

<br /><br />

![React](https://img.shields.io/badge/React-181717?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-181717?style=flat-square&logo=typescript&logoColor=3178C6)
![Express](https://img.shields.io/badge/Express-181717?style=flat-square&logo=express&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-181717?style=flat-square&logo=socketdotio&logoColor=00FF9C)
![Prisma](https://img.shields.io/badge/Prisma-181717?style=flat-square&logo=prisma&logoColor=5A67D8)
![Massive](https://img.shields.io/badge/Massive-181717?style=flat-square&logoColor=16A34A)

</div>

---

A real-time stock watchlist: search for tickers, add them to your list, and watch prices update live over a WebSocket. Full-stack — React frontend, Express + WebSocket backend, SQLite persistence via Prisma, [Massive](https://massive.com) (formerly Polygon.io — same company/API, renamed October 2025) for market data.

Built as a portfolio project to demonstrate working with an external API, real-time data over WebSockets, and a properly separated frontend/backend with real persistence — not just a static demo.

### Contents

- [Features](#-features)
- [Status](#-status)
- [Architecture](#️-architecture)
- [Project structure](#-project-structure)
- [Design system](#-design-system)
- [Setup](#-setup)
- [API reference](#-api-reference)
- [Environment variables](#️-environment-variables-backendenv)
- [Security notes](#-security-notes)
- [Roadmap](#️-roadmap)
- [Tech stack](#-tech-stack)

> Note: a couple of the links above rely on GitHub's auto-generated emoji anchors, which aren't always predictable — if one doesn't jump correctly, just scroll, the section's right there.

## ✨ Features

- 🔍 **Ticker search** — type a company name or symbol, get real matches back debounced at 300ms, no page reload.
- ⭐ **Watchlist** — add/remove tickers, persisted server-side in a real database (not `localStorage`), so it survives a refresh or a new browser. Capped at 30 tickers — the same limit a single WebSocket connection can ever subscribe to — with the search box disabling itself and explaining why once you hit it, instead of letting you add a 31st ticker that could never get a live price.
- 📡 **Live prices over WebSocket** — every row updates in place as ticks arrive, with a subtle color-and-icon flash on change (never color alone).
- 📈 **Sparklines** — a rolling 30-point price history per symbol, rendered as inline SVG, no charting library needed for something this small.
- 🕯️ **Candlestick chart** — click a symbol to expand a full OHLC candlestick chart for the last 30 days, same no-dependency SVG approach as the sparkline.
- 🟢 **Transparent data source** — a LIVE/SIM badge on every price and a connection-status indicator in the header, so it's never a mystery whether you're looking at real trades or the simulated fallback.
- 🔔 **Price alerts** — set a one-shot "notify me when AAPL crosses $200" alert per symbol (the bell icon on each row); fires once as soon as a tick crosses the threshold, delivered over the same WebSocket connection as an `{"type":"alert"}` message and shown as a dismissible toast.
- 🔌 **Works with zero setup** — no API key, no account, no config required to run it and see it working end to end.
- ♿ **Accessible by default** — throttled screen-reader announcements, keyboard support, visible focus states, and full `prefers-reduced-motion` compliance.
- ⚠️ **Visible failure states** — a failed watchlist load, ticker add, or alert creation now surfaces as a dismissible error toast instead of failing silently, and the watchlist table distinguishes "loading" from "genuinely empty" on first load.
- 🔐 **Real multi-user accounts** — email/password signup and login (scrypt-hashed, signed session cookie), each user gets their own private watchlist and alerts. Price ticks stay public over the WebSocket (they're just market data), but price-alert notifications are routed only to the connection belonging to the alert's owner.

## 📍 Status

Feature-complete for the initial build. Built incrementally, commit by commit — full history on the repo shows each piece landing and getting manually tested before the next one started.

**✅ Done**
- **Backend**: Express API, Prisma/SQLite persistence, Massive ticker search proxy (with a static fallback list and a free-tier-aware rate limiter), a simulated real-time price engine, real Massive WebSocket integration (with automatic graceful fallback if the key isn't entitled), a WebSocket broadcaster that fans price ticks out to connected clients with per-connection rate/size/subscription limits, and real multi-user auth (scrypt password hashing, signed session cookies, per-user watchlists/alerts).
- **Frontend**: Vite + React + TS app in the dark trading-terminal design system — a login/signup gate in front of the app, debounced ticker search wired to the real API, a watchlist table with sparklines and a working remove button, a live WebSocket client with reconnect/backoff, per-row LIVE/SIM badges, and a header connection-status indicator.
- **Accessibility**: throttled `aria-live` price announcements, a skip link, Escape-to-dismiss on search, visible focus states, `prefers-reduced-motion` support, and color-paired (never color-only) up/down indicators.
- **Testing**: 358 tests total — 171 on the backend (schemas → `PriceFeed` → routes → WS broadcaster → price alerts → history → env var fail-fast behavior → auth routes/rate-limiting → alert-delivery user scoping → watchlist size cap, all wired into CI) and 187 on the frontend (hooks, API client, every component including the login/signup gate, and an `App.tsx` integration suite covering the real wiring between them). See [Setup](#-setup) for how to run them.
- **Security/CI**: see [Security notes](#-security-notes) below — all audits clean, no secrets in history, CI green.

## 🏗️ Architecture

```
┌─────────────────┐         REST (/api/search, /api/watchlist)
│                  │ ───────────────────────────────────────►
│  React frontend  │                                          ┌──────────────────┐
│  (Vite + TS)     │         WebSocket (/ws)                  │  Express backend  │
│                  │ ◄────────────────────────────────────────┤                   │
└─────────────────┘      { type: "tick", symbol, price, ... }  │  - REST routes    │
                                                                 │  - WS broadcaster │
                                                                 │  - PriceFeed      │
                                                                 └─────────┬─────────┘
                                                                           │
                                                       ┌───────────────────┼───────────────────┐
                                                       │                                       │
                                              ┌────────▼─────────┐               ┌─────────────▼──────────┐
                                              │  Massive REST     │               │  Prisma → SQLite        │
                                              │  (ticker search,  │               │  (Watchlist,             │
                                              │   previous close, │               │   WatchlistItem)         │
                                              │   rate-limited)   │               │                          │
                                              └───────────────────┘               └─────────────────────────┘
```

<details>
<summary><strong>PriceFeed abstraction (click to expand)</strong></summary>

```
PriceFeed (backend/src/priceFeed/):
┌─────────────────────────────────────────────┐
│  MASSIVE_API_KEY set?                        │
│    yes → MassiveLiveFeed                     │
│            (wss://socket.massive.com/stocks) │
│            auth fails/not entitled?          │
│              → falls back to SimulatedFeed   │
│    no  → SimulatedFeed directly              │
│           (random walk seeded from Massive's │
│            previous-close REST endpoint)     │
└─────────────────────────────────────────────┘
```

**Why does this exist?** Massive's free tier doesn't include real-time US stock trades over WebSocket — that needs a paid plan, and REST calls are capped at 5/min. Rather than the app being broken or rate-limited into uselessness without one, `PriceFeed` is an interface with two implementations: `SimulatedFeed` (a random walk seeded from a real previous-close price) and `MassiveLiveFeed` (the real thing). `MassiveLiveFeed` detects auth failure or missing entitlement and transparently swaps its subscribers over to `SimulatedFeed` — no reconnect, no frontend changes, no crash. A small sliding-window rate limiter (`backend/src/massive/rateLimiter.ts`) also caps outbound REST calls at 4/min, just under the free-tier ceiling, so ticker search and previous-close lookups degrade to fallback data instead of hitting a 429. Drop in a paid key later and both the WebSocket and rate limits open up automatically.

</details>

## 📁 Project structure

```
stockpulse-watchlist/
├── backend/
│   ├── src/
│   │   ├── server.ts              # http server + attaches the WS broadcaster
│   │   ├── app.ts                 # Express app: helmet, CORS, rate limiting, routes
│   │   ├── env.ts                 # env var loading with sane defaults
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── asyncHandler.ts        # wraps async route handlers so errors don't hang
│   │   ├── watchlistHelper.ts     # shared getOrCreateWatchlist(), used by watchlist + alerts routes
│   │   ├── auth/
│   │   │   ├── password.ts        # scrypt hash/verify (+ .test.ts)
│   │   │   ├── session.ts         # signed session cookie create/verify (+ .test.ts)
│   │   │   └── middleware.ts      # attachUserId (always runs) + requireAuth (401s if not signed in)
│   │   ├── routes/
│   │   │   ├── auth.ts                    # signup/login/logout/me (+ .routes.test.ts, + .ratelimit.test.ts)
│   │   │   ├── auth.schemas.ts            # email/password schema
│   │   │   ├── watchlist.ts               # GET/POST/DELETE, zod-validated, requires auth (+ .routes.test.ts, real db)
│   │   │   ├── watchlist.schemas.ts       # symbol/addItem schemas (+ .test.ts)
│   │   │   ├── search.ts                  # Massive ticker search proxy + fallback list (+ .routes.test.ts)
│   │   │   ├── search.schemas.ts          # query schema (+ .test.ts)
│   │   │   ├── alerts.ts                  # GET/POST/DELETE price alerts, requires auth (+ .routes.test.ts)
│   │   │   ├── alerts.schemas.ts          # symbol/threshold/direction schema (+ .test.ts)
│   │   │   ├── history.ts                 # GET OHLC candles per symbol (+ .routes.test.ts)
│   │   │   └── history.schemas.ts         # days-range schema (+ .test.ts)
│   │   ├── alerts/
│   │   │   └── checkAndTriggerAlerts.ts   # evaluates a tick against active alerts, marks fired ones (+ .test.ts)
│   │   ├── massive/
│   │   │   ├── fallbackTickers.ts # static list used when there's no API key
│   │   │   ├── fetchHistory.ts    # real Massive aggregates endpoint for OHLC candles
│   │   │   └── rateLimiter.ts     # sliding-window limiter for the free-tier 5/min cap (+ .test.ts)
│   │   ├── priceFeed/
│   │   │   ├── PriceFeed.ts               # the interface
│   │   │   ├── SimulatedFeed.ts           # default — random walk, no key needed (+ .test.ts)
│   │   │   ├── MassiveLiveFeed.ts         # real wss://socket.massive.com/stocks feed (+ .test.ts)
│   │   │   ├── previousClose.ts           # shared REST helper for seeding base prices
│   │   │   ├── deterministicBasePrice.ts  # per-symbol seed shared by SimulatedFeed + simulatedHistory
│   │   │   ├── simulatedHistory.ts        # simulated OHLC candle generator (+ .test.ts)
│   │   │   └── index.ts                   # createPriceFeed() factory
│   │   ├── test/
│   │   │   └── globalSetup.ts     # spins up/tears down prisma/test.db for the route tests
│   │   └── ws/
│   │       ├── broadcaster.ts     # WS server: subscribe/unsubscribe, rate + size limits, user-scoped alert delivery (+ .test.ts)
│   │       └── testHelpers.ts     # FakePriceFeed, real server/client setup (connectClient takes an optional session cookie)
│   ├── prisma/
│   │   ├── schema.prisma          # Watchlist, WatchlistItem, PriceAlert models
│   │   └── migrations/
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # (+ .test.tsx, .module.css — integration suite, real component tree)
│   │   ├── main.tsx
│   │   ├── types.ts                     # shared PriceState type
│   │   ├── index.css                    # global styles, tabular-nums, sr-only, reduced-motion
│   │   ├── styles/tokens.css            # design system CSS variables
│   │   ├── components/          # every component here has a matching .test.tsx and .module.css
│   │   │   ├── Search.tsx               # debounced ticker search
│   │   │   ├── WatchlistTable.tsx       # symbol/price/change/sparkline/remove/alert-bell
│   │   │   ├── PriceCell.tsx            # price + LIVE/SIM badge + tick flash
│   │   │   ├── Sparkline.tsx            # inline SVG price history (SVG presentation attrs, not CSS Modules — nothing to scope)
│   │   │   ├── CandlestickChart.tsx     # inline SVG OHLC chart, click-through from the symbol
│   │   │   ├── ConnectionBadge.tsx      # WS connection status indicator
│   │   │   ├── AlertForm.tsx            # inline threshold/direction form, opened via the bell icon
│   │   │   ├── AlertToast.tsx           # dismissible toast for fired price alerts
│   │   │   ├── ErrorToast.tsx           # dismissible toast for failed load/add/alert-create
│   │   │   └── AuthGate.tsx             # login/signup form, renders in place of the app until signed in
│   │   ├── hooks/
│   │   │   ├── useDebouncedValue.ts     # (+ .test.ts)
│   │   │   ├── useLiveTicks.ts          # WS client: subscribe diffing, reconnect/backoff, alert events (+ .test.ts)
│   │   │   ├── useHistory.ts            # fetches candle data for the expanded chart row (+ .test.ts)
│   │   │   ├── useErrorToasts.ts        # generic dismissible/auto-expiring error toast state (+ .test.ts)
│   │   │   └── useThrottledAnnouncement.ts  # aria-live summary, throttled to 1/8s (+ .test.ts)
│   │   ├── lib/
│   │   │   ├── api.ts                   # fetch wrappers for the backend REST API, credentials: "include" (+ .test.ts)
│   │   │   └── ws.ts                    # WS URL resolution
│   │   └── test/
│   │       └── setup.ts                 # @testing-library/jest-dom matchers
│   └── vite.config.ts, vitest.config.ts
├── .github/workflows/ci.yml
└── .gitignore
```

## 🎨 Design system

Dark "OLED trading terminal" aesthetic, chosen via a design-system search tool (ui-ux-pro-max) for a dense fintech dashboard:

<div align="center">

| Token | Swatch | Value | Use |
|---|---|---|---|
| `--color-background` | ![#020617](https://placehold.co/16x16/020617/020617.png) | `#020617` | page background |
| `--color-primary` | ![#0f172a](https://placehold.co/16x16/0f172a/0f172a.png) | `#0f172a` | header/panel surfaces |
| `--color-secondary` | ![#1e293b](https://placehold.co/16x16/1e293b/1e293b.png) | `#1e293b` | secondary surfaces (dropdowns) |
| `--color-foreground` | ![#f8fafc](https://placehold.co/16x16/f8fafc/f8fafc.png) | `#f8fafc` | body text |
| `--color-accent` | ![#16a34a](https://placehold.co/16x16/16a34a/16a34a.png) | `#16a34a` | primary CTA color |
| `--color-bullish` | ![#26a69a](https://placehold.co/16x16/26a69a/26a69a.png) | `#26a69a` | price up |
| `--color-bearish` | ![#ef5350](https://placehold.co/16x16/ef5350/ef5350.png) | `#ef5350` | price down |
| `--color-border` | ![#334155](https://placehold.co/16x16/334155/334155.png) | `#334155` | dividers |
| `--color-destructive` | ![#dc2626](https://placehold.co/16x16/dc2626/dc2626.png) | `#dc2626` | destructive actions |

</div>

Font: **Inter**. Icons: **Phosphor** (`@phosphor-icons/react`), no emoji in the UI itself. Prices use `font-variant-numeric: tabular-nums` so digits don't jitter as values update. Micro-interactions run 150–300ms with `ease-out`, respecting `prefers-reduced-motion`.

## 🚀 Setup

Requires Node 20+.

```bash
# backend
cd backend
npm install
npx prisma migrate dev
npm run dev                 # http://localhost:4000 — works with zero config, see below

# frontend, in a second terminal
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Then open `http://localhost:5173` — search a ticker, add it, and it should start ticking within a couple seconds on the simulated feed.

Backend tests: `cd backend && npm test` (Vitest — schema validation, `SimulatedFeed`'s random walk, the Massive rate limiter, `MassiveLiveFeed`'s full auth/fallback state machine against a mocked WebSocket, the watchlist/search/alerts/history routes via `supertest` against a real throwaway SQLite database, price-alert triggering logic, the simulated OHLC candle generator, the WS broadcaster itself via real socket connections — subscribe/unsubscribe fan-out, the symbol/rate/payload-size limits, shared-subscription cleanup, and alert delivery — and `env.ts`'s production fail-fast behavior via fresh module re-imports. 129 tests total, no real network calls anywhere in the suite).

Frontend tests: `cd frontend && npm test` (Vitest + Testing Library + jsdom — the debounce/throttle hooks with fake timers, the API client's request-building and error handling with a stubbed `fetch`, `useLiveTicks` against a hand-built fake matching the browser `WebSocket` API, `useHistory` and the `CandlestickChart` it feeds, `useErrorToasts` and the `ErrorToast` it feeds, every component, and an `App.tsx` integration suite that mounts the real component tree — only the REST API client and the WebSocket global are faked — covering the initial load and its loading state, search → add, optimistic remove + rollback, live connection status and price updates, both halves of the alert feature, and the three error-toast failure paths, end to end. 155 tests total.)

The backend works with **zero environment variables set** — it boots on the simulated price feed and a static ticker-search fallback list automatically. You don't need a Massive account to run or demo this.

### 🔑 Getting a Massive API key (optional)

1. Sign up for free at [massive.com](https://massive.com). (Massive is the market-data provider formerly branded Polygon.io — same company and API, they renamed in October 2025. Old `polygon.io` docs/links and existing accounts still work.)
2. Create a `backend/.env` file yourself (there's no `.env.example` template committed to this repo, intentionally — see [Security notes](#-security-notes)) containing at minimum:
   ```
   MASSIVE_API_KEY=your-key-here
   ```
   See [Environment variables](#️-environment-variables-backendenv) below for the other optional vars.
3. Restart the backend.

With a free key, ticker search hits Massive's real REST API instead of the static fallback list — but free-tier accounts are capped at **5 REST calls/min**, so the backend runs a small sliding-window rate limiter (`backend/src/massive/rateLimiter.ts`) that caps itself at 4/min and quietly serves fallback data instead of eating a 429 once it's near the ceiling.

Real-time WebSocket stock trades require a **paid** Massive plan — with a free key, `MassiveLiveFeed` will attempt the connection, get an entitlement error back (`auth_failed`), and automatically fall back to the simulated feed. This is expected and handled gracefully; you'll see a log line explaining it. (Verified this against the real Massive API with a live free-tier key — REST search came back with real results tagged `"source": "massive"`, and the WebSocket fallback triggered exactly as designed.)

### 🔌 Trying the WebSocket directly

Once the backend's running, you can watch live ticks with any WS client, e.g.:

```bash
npx wscat -c ws://localhost:4000/ws
# then send:
{"action":"subscribe","symbols":["AAPL","MSFT"]}
```

You'll get back `{"type":"tick","symbol":"AAPL","price":...,"changePercent":...,"source":"simulated"}` messages roughly every 1.5s per symbol.

## 📖 API reference

### REST

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `GET` | `/health` | — | `{ "status": "ok" }` |
| `POST` | `/api/auth/signup` | `{ email, password }` | `201` `{ user: { id, email } }` + sets session cookie · `409` if email's taken · `400` on invalid input |
| `POST` | `/api/auth/login` | `{ email, password }` | `200` `{ user }` + sets session cookie · `401` on bad credentials (same error either way, doesn't reveal which was wrong) |
| `POST` | `/api/auth/logout` | — | `204`, clears the session cookie |
| `GET` | `/api/auth/me` | — | `200` `{ user }` · `401` if not signed in |
| `GET` | `/api/search` | `?q=<string>` | `{ results: [{ symbol, name }], source: "massive" \| "fallback" }` |
| `GET` | `/api/watchlist` 🔒 | — | `{ items: [{ id, symbol, name, addedAt }] }` |
| `POST` | `/api/watchlist` 🔒 | `{ symbol, name? }` | `201` `{ item }` · `409` if already on the list · `400` on a bad symbol |
| `DELETE` | `/api/watchlist/:symbol` 🔒 | — | `204` on success · `404` if it wasn't there |
| `GET` | `/api/alerts` 🔒 | — | `{ alerts: [{ id, symbol, threshold, direction, createdAt, triggeredAt }] }` |
| `POST` | `/api/alerts` 🔒 | `{ symbol, threshold, direction: "above" \| "below" }` | `201` `{ alert }` · `400` on a bad symbol/threshold/direction |
| `DELETE` | `/api/alerts/:id` 🔒 | — | `204` on success · `404` if it wasn't there (including someone else's alert - same response either way) |
| `GET` | `/api/history/:symbol` | `?days=<7-365, default 30>` | `{ candles: [{ time, open, high, low, close, volume }], source: "massive" \| "simulated" }` |

🔒 = requires a signed-in session (`401` otherwise). `/api/search` and `/api/history` stay open since they're not user-specific data.

### WebSocket (`/ws`)

**Client → server**
```json
{ "action": "subscribe",   "symbols": ["AAPL", "MSFT"] }
{ "action": "unsubscribe", "symbols": ["AAPL"] }
```

**Server → client**
```json
{ "type": "tick",  "symbol": "AAPL", "price": 231.42, "changePercent": 0.87, "timestamp": 1730000000000, "source": "live" }
{ "type": "alert", "id": "cabc123", "symbol": "AAPL", "threshold": 200, "direction": "above", "price": 201.5, "triggeredAt": "2026-01-01T00:00:00.000Z" }
{ "type": "error", "message": "Max 30 symbols per connection" }
```

Alerts are one-shot — once fired, an alert won't fire again on later ticks unless removed and re-created. They're evaluated per tick against every still-active alert on that symbol, but only pushed to connection(s) belonging to the user who created that specific alert - not to every client subscribed to the symbol. Connecting with a valid session cookie (sent automatically by the browser, same as any other request to the API's origin) is what makes a connection eligible to receive alerts at all; an unauthenticated connection still gets ticks, just never alerts.

Per-connection limits: 30 subscribed symbols, 60 messages/min, 2KB max message size — see [Security notes](#-security-notes). The watchlist itself is capped at the same 30 tickers server-side (`POST /api/watchlist` 409s past that), so a client should never actually hit the WS-level symbol cap in normal use — but `useLiveTicks` still handles a `{"type":"error"}` message defensively if it ever does: it forgets what it thinks is subscribed, resends the full desired set from scratch, and surfaces the message as an error toast instead of silently dropping it.

## ⚙️ Environment variables (`backend/.env`)

| Var | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `4000` | |
| `MASSIVE_API_KEY` | no | — | app runs on the simulated feed without it; free tier is rate-limited (5 REST calls/min) and doesn't include real-time WS |
| `DATABASE_URL` | in production | `file:./prisma/dev.db` outside production | SQLite connection string |
| `FRONTEND_ORIGIN` | in production | `http://localhost:5173` outside production | locks down CORS to this origin |
| `SESSION_SECRET` | in production | a fixed dev-only value outside production | signs the session cookie (see [Security notes](#-security-notes)) |

`backend/.env` is gitignored, and no `.env` file of any kind — not even an example/template with blank values — is committed to this repo, to keep the risk surface at zero. The API key never reaches the frontend; all Massive calls happen server-side.

`DATABASE_URL`, `FRONTEND_ORIGIN`, and `SESSION_SECRET` only fall back to their dev defaults when `NODE_ENV` isn't `production`. With `NODE_ENV=production` set, a missing value for any of the three throws at startup instead of silently booting against the wrong database/CORS origin, or - worse, for `SESSION_SECRET` - with a fixed, publicly-known signing key that would let anyone forge a session cookie. See `backend/src/env.ts`.

## 🔒 Security notes

- **Secrets**: `MASSIVE_API_KEY` and `SESSION_SECRET` live only in `backend/.env` (gitignored). Never sent to the client. No `.env` file of any kind is committed — not even a blank `.env.example` template — and CI actively fails the build if one ever gets tracked, on top of a separate grep-based backstop for anything that looks like a committed key.
- **Auth**: passwords are hashed with Node's built-in `crypto.scrypt` (random salt per password, `timingSafeEqual` for the comparison) — not bcrypt/argon2, to avoid a native-binding dependency on top of the one this project already has a Vite 8 headache with. Sessions are an HMAC-SHA256-signed `httpOnly` cookie (`SameSite=Lax`, `Secure` when `FRONTEND_ORIGIN` is https) containing just the user id — tamper-evident, not encrypted, since there's nothing sensitive in the payload beyond an opaque id. Login/signup return the same generic error either way so a failed attempt can't be used to enumerate registered emails, and sit behind a tighter rate limit (10/min) than the general API limit. `/api/watchlist` and `/api/alerts` require a valid session and are scoped to the signed-in user; the WS broadcaster resolves the same session cookie on the raw upgrade request (outside the Express middleware chain) so price-alert notifications go only to the alert's owner, never to every client subscribed to that symbol.
- **Input validation**: every REST endpoint validates its input with `zod` before touching Prisma or building a Massive URL. WebSocket subscribe/unsubscribe messages are validated the same way.
- **Rate limiting**: `express-rate-limit` on all `/api` routes (60 req/min, 10/min on `/api/auth`); the WS broadcaster caps each connection at 30 subscribed symbols, 60 messages/min, and a 2KB max message size, so one misbehaving client can't exhaust server resources.
- **Headers/CORS**: `helmet` for standard security headers; CORS locked to `FRONTEND_ORIGIN` with `credentials: true` (needed for the session cookie), no wildcard.
- **Dependencies**: lockfiles committed for both workspaces. `npm audit` is clean on runtime dependencies. The frontend has one known, accepted exception — see below. (This actually caught something for real once: CI's audit step failed on a previously-untouched backend commit when a new high-severity advisory landed against a transitive test-tooling dependency — `npm audit` checks live against the advisory database, not just the lockfile, so a clean pipeline can go red with zero code changes if something upstream gets flagged. Patched via `npm audit fix` the same day.)
- **CI**: `.github/workflows/ci.yml` runs typecheck + build + tests (backend) + `npm audit` + a secret-pattern grep on every push/PR for both workspaces.
- **Type safety**: `noUnusedLocals`/`noUnusedParameters` enabled on both `tsconfig.json`s so dead imports/params fail typecheck instead of silently piling up. Prisma error handling uses `instanceof Prisma.PrismaClientKnownRequestError` checks, not untyped `catch (err: any)`.

<details>
<summary><strong>Known accepted risk: Vite/esbuild dev-server advisories (click to expand)</strong></summary>

<br />

`npm audit` on the frontend flags a handful of advisories against `vite`/`esbuild` (path traversal and `fs.deny` bypass in Vite's *local dev server*, plus an esbuild dev-server CORS issue). These are:

- Dev-server-only — they don't affect the production build output that actually ships.
- devDependencies, excluded from CI's audit step via `npm audit --omit=dev`.
- Not cleanly fixable right now: the only fix Vite offers is a major-version jump to Vite 8, which uses a new Rolldown-based bundler that currently fails to build on this project's Node version (missing a native binding, `rolldown-binding.darwin-universal.node` not found). Tracked for revisiting once Vite 8 stabilizes.

</details>

## 🗺️ Roadmap

Things that would make sense to add next, roughly in order of value:

- [x] ~~Candlestick/OHLC chart on click-through for a single symbol~~ — done: clicking a symbol expands a hand-rolled SVG candlestick chart (same no-dependency approach as the sparkline) fed by a new `useHistory` hook against the existing `/api/history/:symbol` endpoint. Loading/error/empty states covered, and only one chart fetches/renders at a time.
- [x] ~~Price alerts~~ — done: one-shot "notify me when AAPL crosses $200" alerts, evaluated per tick in the WS broadcaster and delivered as a dismissible toast. No test coverage gap left behind either — schema, route, trigger logic, and broadcaster delivery are all covered.
- [x] ~~Multi-user auth~~ — done: email/password signup and login, scrypt-hashed passwords, signed session cookies. `/api/watchlist` and `/api/alerts` require a signed-in user and are scoped to `req.userId`; the WebSocket broadcaster resolves the connecting user from the same session cookie (parsed by hand, since the WS upgrade request sits outside the Express middleware chain) so price-alert notifications - unlike ticks, which stay public - are only delivered to the alert's actual owner. Out of scope for now: password reset and email verification.
- [x] ~~A real test suite~~ — done: Vitest covering the `PriceFeed` implementations, the Massive rate limiter, and the zod schemas.
- [x] ~~Route-level test coverage~~ — done: the watchlist and search routes are tested through `supertest` against a real (throwaway) SQLite db, not just the validation logic underneath them.
- [x] ~~WS broadcaster test coverage~~ — done: real socket connections (not mocked), covering shared-subscription fan-out, unsubscribe/disconnect cleanup, malformed input, and all three per-connection limits (symbol cap, message rate, payload size). 70 tests total across the whole backend suite now, wired into CI.
- [x] ~~Frontend hook/logic test coverage~~ — done: `useDebouncedValue`, `useThrottledAnnouncement`, the API client, and `useLiveTicks` (the WS client hook, tested against a fake browser `WebSocket`) are all covered. 30 tests, wired into CI.
- [x] ~~Frontend component test coverage~~ — done: every component has rendering/interaction tests (`Search`, `WatchlistTable`, `AlertForm`, `AlertToast`, `Sparkline`, `PriceCell`, `ConnectionBadge`).
- [x] ~~App.tsx integration coverage~~ — done: a dedicated integration suite mounts the real component tree (nothing but the API client and the WebSocket global are faked) and exercises the actual flows a user would hit — load, search/add, remove/rollback, live status and prices, alert create and receive. Frontend testing is now complete top to bottom: hooks → API client → components → App wiring.
- [x] ~~Swap the frontend's inline styles for a proper CSS approach~~ — done: every component moved from inline `style={{...}}` objects to a co-located `.module.css` file (CSS Modules, not Tailwind — smaller diff against the existing design-token setup, no new build tooling). Dynamic styling (flash-on-tick, bullish/bearish color, open/active states) became conditional class names instead of inline style objects. A few component tests that had asserted on inline `style.backgroundColor` now assert on the module's exported class names instead, since jsdom doesn't compute real CSS from scoped classes.
- [ ] Revisit the Vite 8 upgrade once its Rolldown bundler stabilizes on this toolchain (see the accepted-risk note above).

## 🧰 Tech stack

- **Frontend**: React 18, TypeScript, Vite, CSS Modules
- **Backend**: Node.js, Express 4, TypeScript, `ws`
- **Database**: SQLite via Prisma
- **Validation**: Zod
- **External API**: Massive (REST + WebSocket), formerly Polygon.io

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:16A34A,50:0F172A,100:020617&height=100&section=footer" width="100%" alt="footer" />
</div>
