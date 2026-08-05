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
- ⭐ **Watchlist** — add/remove tickers, persisted server-side in a real database (not `localStorage`), so it survives a refresh or a new browser.
- 📡 **Live prices over WebSocket** — every row updates in place as ticks arrive, with a subtle color-and-icon flash on change (never color alone).
- 📈 **Sparklines** — a rolling 30-point price history per symbol, rendered as inline SVG, no charting library needed for something this small.
- 🟢 **Transparent data source** — a LIVE/SIM badge on every price and a connection-status indicator in the header, so it's never a mystery whether you're looking at real trades or the simulated fallback.
- 🔔 **Price alerts** — set a one-shot "notify me when AAPL crosses $200" alert per symbol (the bell icon on each row); fires once as soon as a tick crosses the threshold, delivered over the same WebSocket connection as an `{"type":"alert"}` message and shown as a dismissible toast.
- 🔌 **Works with zero setup** — no API key, no account, no config required to run it and see it working end to end.
- ♿ **Accessible by default** — throttled screen-reader announcements, keyboard support, visible focus states, and full `prefers-reduced-motion` compliance.

## 📍 Status

Feature-complete for the initial build. Built incrementally, commit by commit — full history on the repo shows each piece landing and getting manually tested before the next one started.

**✅ Done**
- **Backend**: Express API, Prisma/SQLite watchlist persistence, Massive ticker search proxy (with a static fallback list and a free-tier-aware rate limiter), a simulated real-time price engine, real Massive WebSocket integration (with automatic graceful fallback if the key isn't entitled), and a WebSocket broadcaster that fans price ticks out to connected clients with per-connection rate/size/subscription limits.
- **Frontend**: Vite + React + TS app in the dark trading-terminal design system — debounced ticker search wired to the real API, a watchlist table with sparklines and a working remove button, a live WebSocket client with reconnect/backoff, per-row LIVE/SIM badges, and a header connection-status indicator.
- **Accessibility**: throttled `aria-live` price announcements, a skip link, Escape-to-dismiss on search, visible focus states, `prefers-reduced-motion` support, and color-paired (never color-only) up/down indicators.
- **Testing**: 140 tests total — 102 on the backend (schemas → `PriceFeed` → routes → WS broadcaster → price alerts, all wired into CI) and 38 on the frontend (hooks + API client). See [Setup](#-setup) for how to run them.
- **Security/CI**: see [Security notes](#-security-notes) below — all audits clean, no secrets in history, CI green.

**⚠️ One caveat**: this was built in a terminal-only environment with no browser available to visually render the app. Everything's been verified end-to-end at the protocol level (REST calls, WebSocket messages, database round-trips, via real test scripts — not guesses), and the code has been read through carefully, but nobody has actually looked at it rendered in a browser yet. If you're picking this up: that's the one thing worth doing first.

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
│   │   ├── routes/
│   │   │   ├── watchlist.ts               # GET/POST/DELETE, zod-validated (+ .routes.test.ts, real db)
│   │   │   ├── watchlist.schemas.ts       # symbol/addItem schemas (+ .test.ts)
│   │   │   ├── search.ts                  # Massive ticker search proxy + fallback list (+ .routes.test.ts)
│   │   │   ├── search.schemas.ts          # query schema (+ .test.ts)
│   │   │   ├── alerts.ts                  # GET/POST/DELETE price alerts (+ .routes.test.ts)
│   │   │   └── alerts.schemas.ts          # symbol/threshold/direction schema (+ .test.ts)
│   │   ├── alerts/
│   │   │   └── checkAndTriggerAlerts.ts   # evaluates a tick against active alerts, marks fired ones (+ .test.ts)
│   │   ├── massive/
│   │   │   ├── fallbackTickers.ts # static list used when there's no API key
│   │   │   └── rateLimiter.ts     # sliding-window limiter for the free-tier 5/min cap (+ .test.ts)
│   │   ├── priceFeed/
│   │   │   ├── PriceFeed.ts       # the interface
│   │   │   ├── SimulatedFeed.ts   # default — random walk, no key needed (+ .test.ts)
│   │   │   ├── MassiveLiveFeed.ts # real wss://socket.massive.com/stocks feed (+ .test.ts)
│   │   │   ├── previousClose.ts   # shared REST helper for seeding base prices
│   │   │   └── index.ts           # createPriceFeed() factory
│   │   ├── test/
│   │   │   └── globalSetup.ts     # spins up/tears down prisma/test.db for the route tests
│   │   └── ws/
│   │       ├── broadcaster.ts     # WS server: subscribe/unsubscribe, rate + size limits, alert delivery (+ .test.ts)
│   │       └── testHelpers.ts     # FakePriceFeed, real server/client setup for the broadcaster tests
│   ├── prisma/
│   │   ├── schema.prisma          # Watchlist, WatchlistItem, PriceAlert models
│   │   └── migrations/
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── types.ts                     # shared PriceState type
│   │   ├── index.css                    # global styles, tabular-nums, sr-only, reduced-motion
│   │   ├── styles/tokens.css            # design system CSS variables
│   │   ├── components/
│   │   │   ├── Search.tsx               # debounced ticker search
│   │   │   ├── WatchlistTable.tsx       # symbol/price/change/sparkline/remove/alert-bell
│   │   │   ├── PriceCell.tsx            # price + LIVE/SIM badge + tick flash
│   │   │   ├── Sparkline.tsx            # inline SVG price history
│   │   │   ├── ConnectionBadge.tsx      # WS connection status indicator
│   │   │   ├── AlertForm.tsx            # inline threshold/direction form, opened via the bell icon
│   │   │   └── AlertToast.tsx           # dismissible toast for fired price alerts
│   │   ├── hooks/
│   │   │   ├── useDebouncedValue.ts     # (+ .test.ts)
│   │   │   ├── useLiveTicks.ts          # WS client: subscribe diffing, reconnect/backoff, alert events (+ .test.ts)
│   │   │   └── useThrottledAnnouncement.ts  # aria-live summary, throttled to 1/8s (+ .test.ts)
│   │   ├── lib/
│   │   │   ├── api.ts                   # fetch wrappers for the backend REST API (+ .test.ts)
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

Backend tests: `cd backend && npm test` (Vitest — schema validation, `SimulatedFeed`'s random walk, the Massive rate limiter, `MassiveLiveFeed`'s full auth/fallback state machine against a mocked WebSocket, the watchlist/search/alerts routes via `supertest` against a real throwaway SQLite database, price-alert triggering logic, and the WS broadcaster itself via real socket connections — subscribe/unsubscribe fan-out, the symbol/rate/payload-size limits, shared-subscription cleanup, and alert delivery. 102 tests total, no real network calls anywhere in the suite).

Frontend tests: `cd frontend && npm test` (Vitest + Testing Library + jsdom — the debounce/throttle hooks with fake timers, the API client's request-building and error handling with a stubbed `fetch`, and `useLiveTicks` — the WebSocket client hook — against a hand-built fake matching the browser `WebSocket` API, covering subscription diffing, reconnect-with-backoff, and alert-message handling. 38 tests total.)

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
| `GET` | `/api/search` | `?q=<string>` | `{ results: [{ symbol, name }], source: "massive" \| "fallback" }` |
| `GET` | `/api/watchlist` | — | `{ items: [{ id, symbol, name, addedAt }] }` |
| `POST` | `/api/watchlist` | `{ symbol, name? }` | `201` `{ item }` · `409` if already on the list · `400` on a bad symbol |
| `DELETE` | `/api/watchlist/:symbol` | — | `204` on success · `404` if it wasn't there |
| `GET` | `/api/alerts` | — | `{ alerts: [{ id, symbol, threshold, direction, createdAt, triggeredAt }] }` |
| `POST` | `/api/alerts` | `{ symbol, threshold, direction: "above" \| "below" }` | `201` `{ alert }` · `400` on a bad symbol/threshold/direction |
| `DELETE` | `/api/alerts/:id` | — | `204` on success · `404` if it wasn't there |

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

Alerts are one-shot — once fired, an alert won't fire again on later ticks unless removed and re-created. They're evaluated per tick against every still-active alert on that symbol and pushed to every client currently subscribed to it, not just the one that created the alert.

Per-connection limits: 30 subscribed symbols, 60 messages/min, 2KB max message size — see [Security notes](#-security-notes).

## ⚙️ Environment variables (`backend/.env`)

| Var | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `4000` | |
| `MASSIVE_API_KEY` | no | — | app runs on the simulated feed without it; free tier is rate-limited (5 REST calls/min) and doesn't include real-time WS |
| `DATABASE_URL` | no | `file:./prisma/dev.db` | SQLite connection string |
| `FRONTEND_ORIGIN` | no | `http://localhost:5173` | locks down CORS to this origin |

`backend/.env` is gitignored, and no `.env` file of any kind — not even an example/template with blank values — is committed to this repo, to keep the risk surface at zero. The API key never reaches the frontend; all Massive calls happen server-side.

## 🔒 Security notes

- **Secrets**: `MASSIVE_API_KEY` lives only in `backend/.env` (gitignored). Never sent to the client. No `.env` file of any kind is committed — not even a blank `.env.example` template — and CI actively fails the build if one ever gets tracked, on top of a separate grep-based backstop for anything that looks like a committed key.
- **Input validation**: every REST endpoint validates its input with `zod` before touching Prisma or building a Massive URL. WebSocket subscribe/unsubscribe messages are validated the same way.
- **Rate limiting**: `express-rate-limit` on all `/api` routes (60 req/min); the WS broadcaster caps each connection at 30 subscribed symbols, 60 messages/min, and a 2KB max message size, so one misbehaving client can't exhaust server resources.
- **Headers/CORS**: `helmet` for standard security headers; CORS locked to `FRONTEND_ORIGIN`, no wildcard.
- **Dependencies**: lockfiles committed for both workspaces. `npm audit` is clean on runtime dependencies. The frontend has one known, accepted exception — see below.
- **CI**: `.github/workflows/ci.yml` runs typecheck + build + tests (backend) + `npm audit` + a secret-pattern grep on every push/PR for both workspaces.

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

- [ ] Candlestick/OHLC chart on click-through for a single symbol, instead of just the row sparkline.
- [x] ~~Price alerts~~ — done: one-shot "notify me when AAPL crosses $200" alerts, evaluated per tick in the WS broadcaster and delivered as a dismissible toast. No test coverage gap left behind either — schema, route, trigger logic, and broadcaster delivery are all covered.
- [ ] Multi-user auth — the `Watchlist.userId` column already exists for this, no schema migration needed.
- [x] ~~A real test suite~~ — done: Vitest covering the `PriceFeed` implementations, the Massive rate limiter, and the zod schemas.
- [x] ~~Route-level test coverage~~ — done: the watchlist and search routes are tested through `supertest` against a real (throwaway) SQLite db, not just the validation logic underneath them.
- [x] ~~WS broadcaster test coverage~~ — done: real socket connections (not mocked), covering shared-subscription fan-out, unsubscribe/disconnect cleanup, malformed input, and all three per-connection limits (symbol cap, message rate, payload size). 70 tests total across the whole backend suite now, wired into CI.
- [x] ~~Frontend hook/logic test coverage~~ — done: `useDebouncedValue`, `useThrottledAnnouncement`, the API client, and `useLiveTicks` (the WS client hook, tested against a fake browser `WebSocket`) are all covered. 30 tests, wired into CI.
- [ ] Frontend *component* test coverage — the hooks and logic underneath the UI are tested, but the React components themselves (`WatchlistTable`, `Search`, `Sparkline`, `PriceCell`, `ConnectionBadge`, `App`) don't have rendering tests yet.
- [ ] Swap the frontend's inline styles for a proper CSS approach (Tailwind or CSS modules) now that the component count has grown past what inline styles comfortably scale to.
- [ ] Revisit the Vite 8 upgrade once its Rolldown bundler stabilizes on this toolchain (see the accepted-risk note above).

## 🧰 Tech stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Node.js, Express 4, TypeScript, `ws`
- **Database**: SQLite via Prisma
- **Validation**: Zod
- **External API**: Massive (REST + WebSocket), formerly Polygon.io

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:16A34A,50:0F172A,100:020617&height=100&section=footer" width="100%" alt="footer" />
</div>
