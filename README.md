<div align="center">

<img src="https://capsule-render.vercel.app/api?type=soft&color=0:0D0C2B,50:4B21B0,100:8044FE&height=180&section=header&text=StockPulse&fontSize=54&fontColor=FFFFFF&fontAlignY=35&animation=fadeIn&desc=live%20tickers.%20a%20real%20portfolio.%20no%20fake%20data%20labeled%20as%20real.&descAlignY=58&descSize=16&descAlign=50" width="100%" alt="StockPulse banner" />

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=18&duration=2200&pause=800&color=8044FE&background=FFFFFF00&center=true&vCenter=true&width=620&lines=%24+watching+AAPL...+%2B0.34%25;%24+position%3A+12+shares+%40+%24300.00;%24+profit%3A+%2B%24425.40+(%2B11.82%25);%24+connection%3A+live" alt="Terminal-style typing animation" />

<br /><br />

![React](https://img.shields.io/badge/React-181717?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-181717?style=flat-square&logo=typescript&logoColor=3178C6)
![Express](https://img.shields.io/badge/Express-181717?style=flat-square&logo=express&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-181717?style=flat-square&logo=socketdotio&logoColor=00FF9C)
![Prisma](https://img.shields.io/badge/Prisma-181717?style=flat-square&logo=prisma&logoColor=5A67D8)
![Massive](https://img.shields.io/badge/Massive-181717?style=flat-square&logoColor=16A34A)

</div>

---

A real-time stock watchlist: search for tickers, add them to your list, and watch prices update live over a WebSocket. Full-stack — React frontend, Express + WebSocket backend, Postgres persistence via Prisma, [Massive](https://massive.com) (formerly Polygon.io — same company/API, renamed October 2025) for market data.

Built as a portfolio project to demonstrate working with an external API, real-time data over WebSockets, and a properly separated frontend/backend with real persistence — not just a static demo.

### Contents

- [Features](#-features)
- [Status](#-status)
- [Architecture](#️-architecture)
- [Project structure](#-project-structure)
- [Design system](#-design-system)
- [Setup](#-setup)
- [Contributing](#-contributing-to-this-repo)
- [Accessibility](#-accessibility)
- [Known issues](#-known-issues)
- [Backups](#-backups)
- [Deployment](#-deployment)
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
- 🕯️ **Candlestick chart** — click a ticker to open its own screen with a full OHLC chart, switchable across 1W/1M/3M/6M/1Y, same no-dependency SVG approach as the sparkline. (The reference design offered 1-day and 3-year too; `/api/history` only serves 7–365 days, so those pills would have errored and aren't there.)
- 🧭 **Sidebar app shell** — Dashboard, Wallet, and Profile as real screens, plus a per-ticker Stock screen reached by clicking a row. Navigation is plain state, no router dependency, and the WebSocket subscription stays up across screen changes.
- 💰 **Wallet** — total value, total cost, and profit in $ and %, computed from the shares and cost basis you enter. While any holding is still waiting on its first tick the totals show a dash rather than a partial sum that would silently understate them.
- 👤 **Profile** — account email, verification status, and inline shares/cost-basis entry per ticker. This is what turns a watched symbol into a tracked position.
- 🌓 **Light and dark themes** — light by default (matching the reference), switchable from the header, persisted to `localStorage`. Both palettes are contrast-checked against composed UI, not just base tokens — the light theme originally wasn't, and three real failures came out of checking it properly.
- 🟢 **Transparent data source** — a LIVE/SIM badge on every price and a connection-status indicator in the header, so it's never a mystery whether you're looking at real trades or the simulated fallback.
- 🔔 **Price alerts** — set a one-shot "notify me when AAPL crosses $200" alert per symbol (the bell icon on each row); fires once as soon as a tick crosses the threshold, delivered over the same WebSocket connection as an `{"type":"alert"}` message and shown as a dismissible toast.
- 🔌 **Works with zero setup** — no API key, no account, no config required to run it and see it working end to end.
- ♿ **Accessible by default** — throttled screen-reader announcements, keyboard support, visible focus states, and full `prefers-reduced-motion` compliance. Audited against WCAG 2.2 AA rather than assumed; see [Accessibility](#-accessibility) for what that audit found and what's still open.
- ⚠️ **Visible failure states** — a failed watchlist load, ticker add, or alert creation now surfaces as a dismissible error toast instead of failing silently, and the watchlist table distinguishes "loading" from "genuinely empty" on first load.
- 🔐 **Real multi-user accounts** — email/password signup and login (scrypt-hashed, signed session cookie), each user gets their own private watchlist and alerts. Price ticks stay public over the WebSocket (they're just market data), but price-alert notifications are routed only to the connection belonging to the alert's owner.

## 📍 Status

**Live**, on Render's free tier:

| | |
|---|---|
| App | https://stockpulse-b449.onrender.com |
| API | https://stockpulse-api-n3yu.onrender.com |

Both come out of `render.yaml` (see [Deployment](#-deployment)). The free instance sleeps when idle, so the first request after a quiet spell takes ~50s to wake — that's the platform, not the app.

> **The free database is deleted on 20 September 2026**, not suspended. See [Backups](#-backups) — that script is the whole contingency.

Feature-complete for the initial build. Built incrementally, commit by commit — full history on the repo shows each piece landing and getting manually tested before the next one started.

**✅ Done**
- **Backend**: Express API, Prisma/Postgres persistence, Massive ticker search proxy (with a static fallback list and a free-tier-aware rate limiter), a simulated real-time price engine, real Massive WebSocket integration (with automatic graceful fallback if the key isn't entitled), a WebSocket broadcaster that fans price ticks out to connected clients with per-IP rate limits and per-connection size/subscription limits, and real multi-user auth (scrypt password hashing, signed session cookies, per-user watchlists/alerts).
- **Frontend**: Vite + React + TS app built against a Figma trading-dashboard reference — a login/signup gate, a sidebar shell with Dashboard/Wallet/Profile/Stock screens, portfolio cards and a watching rail, debounced ticker search wired to the real API, a watchlist table with sparklines, a live WebSocket client with reconnect/backoff, per-row LIVE/SIM badges, a connection-status indicator, and a light/dark theme toggle.
- **Accessibility**: throttled `aria-live` price announcements, a skip link, Escape-to-dismiss on search, visible focus states, `prefers-reduced-motion` support, and color-paired (never color-only) up/down indicators.
- **Testing**: 581 tests total — 259 on the backend (schemas → `PriceFeed` → routes → WS broadcaster → price alerts → history → env var fail-fast behavior → auth routes/rate-limiting → alert-delivery user scoping → watchlist size cap, all wired into CI) and 322 on the frontend (hooks, API client, portfolio maths, WebSocket message validation, every component and screen, and an `App.tsx` integration suite covering the real wiring between them). See [Setup](#-setup) for how to run them.
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
                                              │  Massive REST    │               │  Prisma → Postgres     │
                                              │  (ticker search, │               │  (User, Watchlist,     │
                                              │   previous close,│               │   WatchlistItem,       │
                                              │   rate-limited)  │               │   PriceAlert)          │
                                              └──────────────────┘               └────────────────────────┘
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
│   │   ├── wsLimits.ts            # MAX_SYMBOLS_PER_CLIENT (30) - shared between the WS broadcaster and the watchlist size cap
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
│   │   ├── App.tsx                      # auth-status gate only — checking/AuthGate/Dashboard (+ .test.tsx, integration suite)
│   │   ├── Dashboard.tsx                # authenticated shell: owns watchlist + live ticks, swaps views — remounted per key={user.id}
│   │   ├── App.module.css               # shell layout (sidebar + content column + top bar)
│   │   ├── views/                       # one file per screen, each with a .test.tsx and .module.css
│   │   │   ├── DashboardView.tsx        # stats, portfolio cards, chart panel + watching rail, watchlist table
│   │   │   ├── WalletView.tsx           # portfolio totals and per-holding breakdown
│   │   │   ├── ProfileView.tsx          # account details + inline holdings entry
│   │   │   └── StockDetailView.tsx      # per-symbol chart, position, and price alert
│   │   ├── main.tsx
│   │   ├── types.ts                     # shared PriceState type
│   │   ├── index.css                    # global styles, tabular-nums, sr-only, reduced-motion
│   │   ├── styles/tokens.css            # design system CSS variables
│   │   ├── components/          # every component here has a matching .test.tsx and .module.css
│   │   │   ├── Search.tsx               # debounced ticker search
│   │   │   ├── WatchlistTable.tsx       # symbol/price/change/sparkline/remove/alert-bell
│   │   │   ├── PriceCell.tsx            # price + LIVE/SIM badge + tick flash
│   │   │   ├── Sparkline.tsx            # inline SVG price history (SVG presentation attrs, not CSS Modules — nothing to scope)
│   │   │   ├── CandlestickChart.tsx     # inline SVG OHLC chart
│   │   │   ├── SymbolChartPanel.tsx     # chart + timeframe pills + live price header
│   │   │   ├── Sidebar.tsx              # persistent nav; collapses to an icon rail under 1000px
│   │   │   ├── PortfolioCards.tsx       # one card per open position
│   │   │   ├── FavoritesList.tsx        # compact watching rail beside the chart
│   │   │   ├── HoldingsForm.tsx         # inline shares/cost-basis entry
│   │   │   ├── TickerAvatar.tsx         # deterministic coloured initials (no fake brand logos)
│   │   │   ├── ThemeToggle.tsx          # light/dark switch
│   │   │   ├── ConnectionBadge.tsx      # WS connection status indicator
│   │   │   ├── AlertForm.tsx            # inline threshold/direction form, opened via the bell icon
│   │   │   ├── AlertToast.tsx           # dismissible toast for fired price alerts
│   │   │   ├── ErrorToast.tsx           # dismissible toast for failed load/add/alert-create
│   │   │   └── AuthGate.tsx             # login/signup form, renders in place of the app until signed in
│   │   ├── hooks/
│   │   │   ├── useTheme.ts              # light/dark, persisted to localStorage (+ .test.ts)
│   │   │   ├── useDebouncedValue.ts     # (+ .test.ts)
│   │   │   ├── useLiveTicks.ts          # WS client: subscribe diffing, reconnect/backoff, alert events (+ .test.ts)
│   │   │   ├── useHistory.ts            # fetches candle data for the expanded chart row (+ .test.ts)
│   │   │   ├── useErrorToasts.ts        # generic dismissible/auto-expiring error toast state (+ .test.ts)
│   │   │   └── useThrottledAnnouncement.ts  # aria-live summary, throttled to 1/8s (+ .test.ts)
│   │   ├── lib/
│   │   │   ├── api.ts                   # fetch wrappers for the backend REST API, credentials: "include" (+ .test.ts)
│   │   │   ├── holdings.ts              # portfolio maths: cost, market value, profit (+ .test.ts)
│   │   │   ├── format.ts                # currency/percent/share formatting
│   │   │   ├── views.ts                 # the View union the shell navigates over
│   │   │   ├── ws.ts                    # WS URL resolution
│   │   │   └── limits.ts                # MAX_WATCHLIST_SYMBOLS (30) - mirrors backend/src/wsLimits.ts
│   │   └── test/
│   │       └── setup.ts                 # @testing-library/jest-dom matchers
│   └── vite.config.ts, vitest.config.ts
├── .github/workflows/ci.yml
└── .gitignore
```

## 🎨 Design system

Light-first dashboard built against a Figma trading-dashboard reference, with a full dark theme behind a toggle. Values below are the real tokens in `frontend/src/styles/tokens.css` — the light set is `:root`, the dark set overrides it under `:root[data-theme="dark"]`.

<div align="center">

| Token | Light | | Dark | | Use |
|---|---|---|---|---|---|
| `--color-background` | ![#f6f7f9](https://placehold.co/14x14/f6f7f9/f6f7f9.png) | `#f6f7f9` | ![#0b0b12](https://placehold.co/14x14/0b0b12/0b0b12.png) | `#0b0b12` | page canvas |
| `--color-secondary` | ![#ffffff](https://placehold.co/14x14/ffffff/ffffff.png) | `#ffffff` | ![#14141f](https://placehold.co/14x14/14141f/14141f.png) | `#14141f` | cards, sidebar, top bar |
| `--color-foreground` | ![#0d0c2b](https://placehold.co/14x14/0d0c2b/0d0c2b.png) | `#0d0c2b` | ![#f4f4f6](https://placehold.co/14x14/f4f4f6/f4f4f6.png) | `#f4f4f6` | body text |
| `--color-foreground-muted` | ![#7c7c8a](https://placehold.co/14x14/7c7c8a/7c7c8a.png) | `#7c7c8a` | ![#9494a6](https://placehold.co/14x14/9494a6/9494a6.png) | `#9494a6` | labels, secondary text |
| `--color-accent` | ![#8044fe](https://placehold.co/14x14/8044fe/8044fe.png) | `#8044fe` | ![#9b6bff](https://placehold.co/14x14/9b6bff/9b6bff.png) | `#9b6bff` | CTAs, active nav |
| `--color-accent-soft` | ![#f1ebff](https://placehold.co/14x14/f1ebff/f1ebff.png) | `#f1ebff` | ![#241a3d](https://placehold.co/14x14/241a3d/241a3d.png) | `#241a3d` | active/hover fills |
| `--color-bullish` | ![#0b9a63](https://placehold.co/14x14/0b9a63/0b9a63.png) | `#0b9a63` | ![#26c281](https://placehold.co/14x14/26c281/26c281.png) | `#26c281` | price up, profit |
| `--color-bearish` | ![#d92d20](https://placehold.co/14x14/d92d20/d92d20.png) | `#d92d20` | ![#f0554b](https://placehold.co/14x14/f0554b/f0554b.png) | `#f0554b` | price down, loss |
| `--color-border` | ![#ececf0](https://placehold.co/14x14/ececf0/ececf0.png) | `#ececf0` | ![#262636](https://placehold.co/14x14/262636/262636.png) | `#262636` | dividers |

</div>

A separate `--color-on-accent` (always `#ffffff`) carries text sitting on the accent or on a ticker avatar, since those fills stay saturated in both themes. Reusing `--color-on-primary` there put near-black text on violet in dark mode — that was a real bug, and this token is the fix.

Font: **Inter**. Icons: **Phosphor** (`@phosphor-icons/react`), no emoji in the UI itself. Prices use `font-variant-numeric: tabular-nums` so digits don't jitter as values update. Micro-interactions run 150–300ms with `ease-out`, respecting `prefers-reduced-motion`. Cards take their lift from a wide, low-opacity shadow rather than a border, matching the reference.

## 🚀 Setup

Requires Node ≥20.19.0 (or ≥22.12.0) — that's what Vite 8/Rolldown need. A `.nvmrc` is committed at the repo root *and* in each package — the root one is what `nvm use` and CI read, and the per-package copies are what Render reads, since it resolves the version file from a service's root directory rather than the repo's.

> **Dependencies deliberately held back**, so nobody "helpfully" bumps them and breaks the build:
>
> - **`jsdom` at 27** — 28+ pulls an `undici` that calls `webidl.util.markAsUncloneable`, a Node 22 API. On the pinned Node 20 the test suite fails to collect at all.
> - **`@types/node` at 20** — types should track the Node major actually being run. Types ahead of the runtime let TypeScript accept calls that don't exist at execution time, which quietly removes the guard rail.
> - **`cookie` at 0.7** — tried v2 and backed it out. The rename (`parse` → `parseCookie`) is trivial and the `node16` migration did fix the types resolution, but underneath both sits the real blocker: **v2 is ESM-only**, and this package emits CommonJS, so `require()` can't load it at all (`TS1479`). Taking it means converting the whole backend to ESM, which is a far bigger change than a dependency bump and buys nothing here — there's no advisory against 0.7. Note the stale `@types/cookie` also has to go when this eventually happens; it shadows v2's own bundled types.
> - **`deepmerge-ts` forced to 8** via an `overrides` entry — Prisma 7's CLI pins 7.1.5, which carries a high-severity stack-exhaustion advisory (GHSA-ggr8-5vv4-36mx). The CLI works fine on 8, and `npm audit` is a CI gate.

The backend needs a Postgres to talk to. The quickest local one is a container:

```bash
docker run -d --name stockpulse-pg \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=stockpulse_test -p 5432:5432 postgres:18
```

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

Linting: `npm run lint` in either package (ESLint 9 flat config; the frontend adds `react-hooks` and `jsx-a11y`, both wired into CI).

Backend tests: `cd backend && npm test` (Vitest — schema validation, `SimulatedFeed`'s random walk, the Massive rate limiter, `MassiveLiveFeed`'s full auth/fallback state machine against a mocked WebSocket, the watchlist/search/alerts/history routes via `supertest` against a real throwaway Postgres database, price-alert triggering logic, the simulated OHLC candle generator, the WS broadcaster itself via real socket connections — subscribe/unsubscribe fan-out, the symbol/rate/payload-size limits including the per-IP budget surviving a reconnect, shared-subscription cleanup, and alert delivery — and `env.ts`'s production fail-fast behavior via fresh module re-imports. 259 tests total, no real network calls anywhere in the suite).

The suite drops and recreates the schema before every run, so it refuses to start against anything that isn't localhost — that guard is the only thing standing between a stray `DATABASE_URL` and your production data. See `src/test/globalSetup.ts`.

Frontend tests: `cd frontend && npm test` (Vitest + Testing Library + jsdom — the debounce/throttle hooks with fake timers, the API client's request-building and error handling with a stubbed `fetch`, `useLiveTicks` against a hand-built fake matching the browser `WebSocket` API, `useHistory` and the `CandlestickChart` it feeds, `useErrorToasts` and the `ErrorToast` it feeds, every component, and an `App.tsx` integration suite that mounts the real component tree — only the REST API client and the WebSocket global are faked — covering the initial load and its loading state, search → add, optimistic remove + rollback, live connection status and price updates, both halves of the alert feature, and the three error-toast failure paths, end to end. 322 tests total.)

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

## 🌿 Contributing to this repo

`main` is protected: no direct pushes, and the secret scan plus both package pipelines have to be green before a pull request can merge. That applies to the repo owner too — protection that the owner can walk past isn't protection.

```bash
git switch -c your-branch
# ...work, commit...
git push -u origin your-branch
gh pr create --fill && gh pr merge --squash
```

## ♿ Accessibility

Audited against **WCAG 2.2 AA**. Worth being specific about, because the claims above were previously unverified and two of them turned out to be partly wrong.

**Verified sound:** the collapsed sidebar icon rail carries correct accessible names at every breakpoint (the `aria-label` never depends on the CSS that hides the visible text). Screen-reader price announcements really are throttled to one per 8s through an always-mounted live region. `prefers-reduced-motion` is comprehensive — every animation and transition is CSS-driven, so the blanket override in `index.css` genuinely catches all of them. The SVG sparkline and candlestick chart expose data-derived labels rather than raw markup. Table semantics and touch-target sizes (SC 2.5.8) hold up throughout.

**Fixed as a result:**

| Issue | Was |
|---|---|
| Focus lost to `<body>` when the auth form changed mode | keyboard users lost their place silently |
| `aria-hidden` wrapping real marketing copy, not just the hero chart | screen readers never got it |
| "Email not verified" badge using a fill colour as text | 1.91:1 |
| Accent text on `--color-accent-soft` (active nav) | 4.33:1 |
| Bearish text on a hovered row | 4.16:1 |
| Bearish text on the page background | 4.51:1 — a pass by 0.01 |
| Form inputs replacing the 2px focus ring with a 1px border tint | least-visible focus targets in the app |
| Resting input boundary against its card | 1.07:1 — now a dedicated token at 3.24:1 |
| Watchlist table clipped by the card's `overflow: hidden` | no escape hatch at 320px or 400% zoom |
| `<aside>` announcing primary nav as complementary | now a plain wrapper; the inner `<nav>` does the work |

Ratios were computed from the token hex values and re-derived independently rather than taken from the audit on trust — which was worth doing, since one reported failure (accent text on white, claimed 4.06:1) actually measures **5.03:1** and passes. The dark theme was measured too and already cleared AA everywhere, so only light-theme values moved.

**Still open, honestly:**

- The auth notice banners mount conditionally rather than swapping text in an always-present live region. Support for that pattern varies by screen reader; needs a real NVDA/VoiceOver pass to decide if it matters.

## 🐛 Known issues

**The backend suite is intermittently red.** Three separate runs failed this week, each on a different test, each passing alone and passing again on a rerun — so a failure here is worth rerunning once before believing it.

What's been ruled out, with measurements rather than guesses:

- **Not connection exhaustion.** Sampled `pg_stat_activity` throughout a full run: it peaks at **2** connections against a limit of 100.
- **Not just the timeout.** The default 5s was too tight for tests that drive real timers, and both suites now allow 15s — but one run still failed after that change, so the timeout was a contributing factor at most.

Still undiagnosed. Nine test files share one Postgres database and run serially (`fileParallelism: false`), so a cross-file ordering effect is the obvious next place to look — but it hasn't been reproduced deliberately yet, and guessing at a fix for something that won't reproduce is how you end up with two problems.

## 💾 Backups

The Render free database is **deleted on its expiry date**, not suspended. Losing it loses every account, watchlist and holding, and nothing in this repo prevents that — the only protection is having a copy somewhere else.

```bash
# the EXTERNAL connection string from the Render dashboard; the internal
# hostname only resolves from inside Render's network
DATABASE_URL='postgresql://...' ./scripts/backup-db.sh
```

Writes a timestamped `backups/stockpulse-<date>.sql.gz`. Read-only — it never writes to the database.

Two things worth knowing about how it works:

- **`pg_dump` runs inside the `postgres:18` image**, not from a local install. Partly because there's no `pg_dump` on the dev machine, but mainly because `pg_dump` refuses to dump a server newer than itself. Pinning the image to the server's major is what stops this quietly breaking the next time Postgres is upgraded — the failure mode otherwise is a backup script that looks fine and produces nothing.
- **It verifies the dump before claiming success.** `pg_dump` exits 0 on a truncated or empty result just as happily as a good one, so the script checks all four tables are actually present and reports how many data blocks it captured.

To restore, into a **new, empty** database:

```bash
gzip -dc backups/stockpulse-<date>.sql.gz \
  | docker run --rm -i -e DATABASE_URL postgres:18 psql "$DATABASE_URL"
```

The dump includes `_prisma_migrations`, so a restored database already knows which migrations have run and `prisma migrate deploy` won't try to replay them. It does **not** drop anything first — restoring over a database that still has rows will collide on primary keys. That's deliberate: a restore script that silently wipes the target is worse than one that refuses.

Verified end to end, not just written: dumped a seeded database, restored it into a fresh one, and confirmed the rows came back.

`backups/` and `*.sql.gz` are gitignored. A dump contains real emails and password hashes.

## 🚢 Deployment

Everything is declared in `render.yaml` at the repo root — a Render Blueprint covering the web service, the static site, and how they wire to the managed Postgres. It's deliberately not configured through dashboard forms: config in a file is reviewable in a diff, and survives someone rebuilding a service from scratch.

Pushing a change to that file **auto-syncs and redeploys**. It is live infrastructure, not documentation.

To stand it up from nothing: **New → Blueprint** in Render, point it at the repo. It prompts for the two secrets marked `sync: false` (`MASSIVE_API_KEY`, `RESEND_API_KEY`) and derives the rest — `DATABASE_URL` resolves through a `fromDatabase` reference to the **internal** connection string, so the database password never appears in the repo and never crosses the public internet, and `SESSION_SECRET` is generated by Render.

Four things about deploying this bit, none of which reproduce locally:

- **`npm ci --include=dev` is load-bearing.** The service sets `NODE_ENV=production` because the app needs it at runtime, but npm reads it at *install* time too and skips devDependencies — which is where `typescript`, the Prisma CLI, and every `@types/*` package live. Without the flag `tsc` runs with no type declarations at all and dies on hundreds of implicit-any errors.
- **Migrations run in the build**, via `npm run migrate:deploy`. Deliberately not part of `npm run build`, because CI runs `build` and CI has no business migrating production.
- **The hostnames are pinned.** Render appends a random suffix when a name is already taken globally, which is why the services are `stockpulse-b449` and `stockpulse-api-n3yu` rather than the bare names. `FRONTEND_ORIGIN` and `VITE_API_URL` refer to those exact hosts and must be changed together — a mismatch means CORS rejects every request.
- **The static site rewrites all paths to `index.html`.** There's no client-side router, but the verification email links to `/verify-email?token=...`, and a static host has no file there — clicking the link returned a 404 until the rewrite went in. `App.tsx` only ever reads `?token=` off the query string, so serving `index.html` everywhere is enough.

`VITE_API_URL` is read at *build* time, not run time — Vite inlines it into the bundle. Changing it needs a rebuild, not a restart.

## 📖 API reference

### REST

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `GET` | `/health` | — | `200` `{ "status": "ok", "database": "ok" }` · `503` `{ "status": "unavailable" }` if Postgres doesn't answer. Render routes traffic on this, so it runs a real query rather than answering unconditionally — and returns no error detail, since it's public and connection errors quote hostnames and usernames |
| `POST` | `/api/auth/signup` | `{ email, password }` | `202` `{ message }` — identical whether or not the address is already registered, and never sets a session (log in as a separate step) · `400` on invalid input |
| `POST` | `/api/auth/login` | `{ email, password }` | `200` `{ user }` + sets session cookie · `401` on bad credentials (same error either way, doesn't reveal which was wrong) |
| `POST` | `/api/auth/logout-everywhere` | — | `204`, ends every session for the account on every device and clears the caller's cookie · `401` if not signed in |
| `POST` | `/api/auth/logout` | — | `204`, clears the session cookie |
| `GET` | `/api/auth/me` | — | `200` `{ user }` · `401` if not signed in |
| `POST` | `/api/auth/verify-email` | `{ token }` | `200` `{ user }` · `400` if the token is unknown, already used, or expired. POST rather than GET because it consumes a single-use token |
| `POST` | `/api/auth/resend-verification` 🔒 | — | `204` · `409` if the address is already verified |
| `GET` | `/api/search` | `?q=<string>` | `{ results: [{ symbol, name }], source: "massive" \| "fallback" }` |
| `GET` | `/api/watchlist` 🔒 | — | `{ items: [{ id, symbol, name, addedAt, shares, costBasis }] }` — `shares`/`costBasis` are `null` for a watched-but-not-held ticker |
| `POST` | `/api/watchlist` 🔒 | `{ symbol, name?, shares?, costBasis? }` | `201` `{ item }` · `409` if already on the list or the watchlist is at its 30-ticker cap · `400` on a bad symbol, or if only one of `shares`/`costBasis` is given |
| `PATCH` | `/api/watchlist/:symbol` 🔒 | `{ shares, costBasis }` — both numbers to set a position, both `null` to clear it | `200` `{ item }` · `404` if the symbol isn't on the list · `400` if only one of the two is `null` |
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
| `DATABASE_URL` | in production | `postgresql://postgres:postgres@localhost:5432/stockpulse_dev` outside production | Postgres connection string |
| `FRONTEND_ORIGIN` | in production | `http://localhost:5173` outside production | locks down CORS to this origin |
| `SESSION_SECRET` | in production | a fixed dev-only value outside production | signs the session cookie (see [Security notes](#-security-notes)) |
| `RESEND_API_KEY` | no | — | verification emails silently don't send without it; signup and login still work |
| `RESEND_FROM_EMAIL` | no | `StockPulse <onboarding@resend.dev>` | Resend's shared test sender, which **only delivers to the Resend account owner's own address**. Reaching anyone else needs a verified domain, which this project deliberately doesn't buy — see [Roadmap](#️-roadmap) |

`backend/.env` is gitignored, and no `.env` file of any kind — not even an example/template with blank values — is committed to this repo, to keep the risk surface at zero. The API key never reaches the frontend; all Massive calls happen server-side.

`DATABASE_URL`, `FRONTEND_ORIGIN`, and `SESSION_SECRET` only fall back to their dev defaults when `NODE_ENV` isn't `production`. With `NODE_ENV=production` set, a missing value for any of the three throws at startup instead of silently booting against the wrong database/CORS origin, or - worse, for `SESSION_SECRET` - with a fixed, publicly-known signing key that would let anyone forge a session cookie. See `backend/src/env.ts`.

> **Prisma 7 note:** the connection URL lives in `backend/prisma.config.ts`, not `schema.prisma` — Prisma 7 removed `datasource.url` — and the runtime client is built around a driver adapter (`@prisma/adapter-pg`) rather than a connection string baked into the schema. See `src/db.ts`, which constructs exactly one client for the process so `tsx watch` reloads don't open a new pool each time.

## 🔒 Security notes

- **Secrets**: `MASSIVE_API_KEY` and `SESSION_SECRET` live only in `backend/.env` (gitignored). Never sent to the client. No `.env` file of any kind is committed — not even a blank `.env.example` template — and CI actively fails the build if one ever gets tracked, on top of a separate grep-based backstop for anything that looks like a committed key.
- **Auth**: passwords are hashed with Node's built-in `crypto.scrypt` (random salt per password, `timingSafeEqual` for the comparison) — not bcrypt/argon2, to avoid a native-binding dependency (this project has had enough native-binding trouble already, see the Vite 8/Rolldown note in the roadmap). Sessions are an HMAC-SHA256-signed `httpOnly` cookie containing just the user id. When `FRONTEND_ORIGIN` is https the cookie goes out `SameSite=None; Secure`, because deployed the app and API are separate `onrender.com` subdomains — and `onrender.com` is on the Public Suffix List, so browsers treat them as cross-site and would silently drop a `Lax` cookie on every API call. Locally both ends are `localhost`, which is same-site, so it stays `Lax` there (`Secure` would break it over plain http) — tamper-evident, not encrypted, since there's nothing sensitive in the payload beyond an opaque id. Login returns the same generic `Invalid email or password` whether the account exists or the password was wrong, so a failed login can't be used to enumerate registered emails; signup no longer leaks it either: it answers `202` with the same body whether the address was free or already registered, never returns a session, and hashes the password on both branches so the response *time* doesn't give it away. The only thing that differs is which email goes out, and that lands in the real owner's inbox rather than the submitter's. Both sit behind a tighter rate limit (10/min) than the general API limit. `/api/watchlist` and `/api/alerts` require a valid session and are scoped to the signed-in user; the WS broadcaster resolves the same session cookie on the raw upgrade request (outside the Express middleware chain) so price-alert notifications go only to the alert's owner, never to every client subscribed to that symbol.
- **Password reset**: single-use token, 1-hour expiry, cleared in the same write that sets the new password. Both endpoints answer identically regardless of whether the address or token exists, so neither can be used to enumerate accounts. Resetting also **signs you out everywhere** — see below.
- **Session revocation**: the session cookie is `<userId>.<epoch>.<hmac>`, and the epoch is inside the signed payload rather than appended to it, so a stale cookie can't have its number raised to dodge a revocation. Every authenticated request compares the cookie's epoch against the user's current one — **one indexed lookup per request**, which is a real cost and the reason this wasn't free: revocation needs server-side state to compare against, and no version of it stays stateless. Bumping the epoch invalidates every session that user has open anywhere, which is what `POST /api/auth/logout-everywhere` does and what a password reset now does automatically. The WebSocket upgrade resolves the session by hand outside the Express chain, so it carries the same check — without it a revoked session kept receiving that user's private alerts on an already-open socket.
- **Input validation**: every REST endpoint validates its input with `zod` before touching Prisma or building a Massive URL. WebSocket subscribe/unsubscribe messages are validated the same way.
- **Rate limiting**: `express-rate-limit` on all `/api` routes (60 req/min, 10/min on `/api/auth`, both skipped under `NODE_ENV=test` since the route test files share one app instance across far more requests than either limit allows — see `auth.ratelimit.test.ts` for a test that exercises the real limiter with `NODE_ENV` overridden back); the WS broadcaster caps 30 subscribed symbols and a 2KB message size per connection, and 60 messages/min plus 8 concurrent connections **per IP**. The message budget deliberately outlives the socket: it used to live on per-connection state, which meant hitting the cap and reconnecting handed back a fresh 60 and made the limit decorative. The IP comes from the last `x-forwarded-for` hop, matching the `trust proxy` setting — earlier entries are client-supplied, and trusting them would let anyone choose their own bucket. `POST /api/watchlist` enforces that same 30-symbol number as a hard cap on watchlist size (`409` past it) — without it, a user could add more tickers than a WS connection can ever subscribe to, and the broadcaster would reject the *entire* subscribe batch, not just the extras, silently breaking live prices for their whole watchlist.
- **Headers/CORS**: `helmet` for standard security headers; CORS locked to `FRONTEND_ORIGIN` with `credentials: true` (needed for the session cookie), no wildcard.
- **Dependencies**: lockfiles committed for both workspaces. `npm audit` is clean on both — the frontend used to carry an accepted set of Vite/esbuild dev-server-only advisories, resolved by the Vite 8 upgrade below rather than left as a permanent exception. (Audit actually caught something for real once, separately: CI's audit step failed on a previously-untouched backend commit when a new high-severity advisory landed against a transitive test-tooling dependency — `npm audit` checks live against the advisory database, not just the lockfile, so a clean pipeline can go red with zero code changes if something upstream gets flagged. Patched via `npm audit fix` the same day.)
- **CI**: `.github/workflows/ci.yml` runs typecheck + build + tests (backend) + `npm audit` + a secret-pattern grep on every push/PR for both workspaces.
- **Type safety**: `noUnusedLocals`/`noUnusedParameters` enabled on both `tsconfig.json`s so dead imports/params fail typecheck instead of silently piling up. Prisma error handling uses `instanceof Prisma.PrismaClientKnownRequestError` checks, not untyped `catch (err: any)`.

## 🗺️ Roadmap

Things that would make sense to add next, roughly in order of value:

- [x] ~~Candlestick/OHLC chart on click-through for a single symbol~~ — done: clicking a symbol expands a hand-rolled SVG candlestick chart (same no-dependency approach as the sparkline) fed by a new `useHistory` hook against the existing `/api/history/:symbol` endpoint. Loading/error/empty states covered, and only one chart fetches/renders at a time.
- [x] ~~Price alerts~~ — done: one-shot "notify me when AAPL crosses $200" alerts, evaluated per tick in the WS broadcaster and delivered as a dismissible toast. No test coverage gap left behind either — schema, route, trigger logic, and broadcaster delivery are all covered.
- [x] ~~Multi-user auth~~ — done: email/password signup and login, scrypt-hashed passwords, signed session cookies. `/api/watchlist` and `/api/alerts` require a signed-in user and are scoped to `req.userId`; the WebSocket broadcaster resolves the connecting user from the same session cookie (parsed by hand, since the WS upgrade request sits outside the Express middleware chain) so price-alert notifications - unlike ticks, which stay public - are only delivered to the alert's actual owner. Password reset is still out of scope; email verification since landed (below).
- [x] ~~A real test suite~~ — done: Vitest covering the `PriceFeed` implementations, the Massive rate limiter, and the zod schemas.
- [x] ~~Route-level test coverage~~ — done: the watchlist and search routes are tested through `supertest` against a real (throwaway) Postgres db, not just the validation logic underneath them.
- [x] ~~WS broadcaster test coverage~~ — done: real socket connections (not mocked), covering shared-subscription fan-out, unsubscribe/disconnect cleanup, malformed input, and all three per-connection limits (symbol cap, message rate, payload size). 70 tests total across the whole backend suite now, wired into CI.
- [x] ~~Frontend hook/logic test coverage~~ — done: `useDebouncedValue`, `useThrottledAnnouncement`, the API client, and `useLiveTicks` (the WS client hook, tested against a fake browser `WebSocket`) are all covered. 30 tests, wired into CI.
- [x] ~~Frontend component test coverage~~ — done: every component has rendering/interaction tests (`Search`, `WatchlistTable`, `AlertForm`, `AlertToast`, `Sparkline`, `PriceCell`, `ConnectionBadge`).
- [x] ~~App.tsx integration coverage~~ — done: a dedicated integration suite mounts the real component tree (nothing but the API client and the WebSocket global are faked) and exercises the actual flows a user would hit — load, search/add, remove/rollback, live status and prices, alert create and receive. Frontend testing is now complete top to bottom: hooks → API client → components → App wiring.
- [x] ~~Swap the frontend's inline styles for a proper CSS approach~~ — done: every component moved from inline `style={{...}}` objects to a co-located `.module.css` file (CSS Modules, not Tailwind — smaller diff against the existing design-token setup, no new build tooling). Dynamic styling (flash-on-tick, bullish/bearish color, open/active states) became conditional class names instead of inline style objects. A few component tests that had asserted on inline `style.backgroundColor` now assert on the module's exported class names instead, since jsdom doesn't compute real CSS from scoped classes.
- [x] ~~Revisit the Vite 8 upgrade~~ — done: the actual blocker was Rolldown needing Node ≥20.19.0 while the dev machine was on 20.12.2, not Vite 8 itself. A minor Node bump (via `nvm`, see `.nvmrc`) unblocked it — Vite 5→8, Vitest 3→4, and `@vitejs/plugin-react` 4→6 all went through with zero config changes, all tests green, and the production build got noticeably faster (~2.7s → ~0.3s) now that Rolldown does the bundling.
- [x] ~~Email verification~~ — done: a signed token mailed via Resend, a `/verify-email` screen that reads the token off the query string, and a resend button. Nothing gates on being verified, so an unverified account still works — it's a trust signal, not a wall. The resend endpoint reports a failed send honestly (`502`) rather than answering `204` and leaving you waiting for mail that was never accepted; signup keeps swallowing the same failure, because its response has to stay identical whether or not the address was already registered.
- [x] ~~Move off SQLite~~ — done: Postgres via Prisma 7's `@prisma/adapter-pg`. The test harness drops and recreates the schema per run and refuses any non-localhost `DATABASE_URL`, which is what keeps that from being terrifying.
- [x] ~~Deploy it~~ — done: Render, declared in `render.yaml` — see [Deployment](#-deployment).
- [x] ~~Close the WebSocket rate-limit hole~~ — done: the 60/min budget moved from per-connection to per-IP and now survives a reconnect, and the upgrade is refused past 8 concurrent connections from one address. Previously a client could hit the cap, hang up, dial back and get a fresh allowance.

- [x] ~~`zod` 3.23 → 4~~ — done: the schemas only used the stable core, so 4.4 compiled and the suite passed untouched. The work was in the two spellings zod 4 deprecates — `z.email()` replacing `.email()` on a string, and refine's `error` replacing `message`. Worth knowing that `z.email().trim()` validates *before* trimming, the reverse of the old chain, so a pasted `"  Me@Example.com  "` gets rejected rather than cleaned up; piping keeps normalisation first. `auth.schemas.ts` had no test file at all, which is how that nearly shipped.
- [x] ~~`typescript` 5.6 → 6~~ — done, in both packages. Stopped at 6 deliberately; see the note below.
- [x] ~~Move the backend off node10 module resolution~~ — done: `moduleResolution` is now `node16`, which can read a package's `exports` map. That was the blocker on the `cookie` v2 upgrade, and TypeScript 7 removes the old option outright, so this had to happen either way. Emit is unchanged — no `"type": "module"`, so it's still CommonJS; the only code change was the `.js` extension node16 requires on relative *dynamic* imports.
- [x] ~~Match Postgres versions~~ — done: CI and the setup container both run 18 now, the same major as the Render instance. They were on 16, which meant every green build was evidence about a database this doesn't deploy to. Suite verified on 18.6 before the switch.
- [x] ~~Password reset~~ — done: `POST /api/auth/forgot-password` and `/reset-password`, plus the two screens. `forgot-password` answers `202` whatever happens, because an unauthenticated caller doesn't get to learn which addresses have accounts — and an unknown token and an expired one give the same answer for the same reason. The token lives an hour rather than the verification token's 24: that one only confirms an address, this one hands over the account. It's spent in the same write that changes the password, so it can't be replayed. Reset deliberately doesn't sign you in — reading the inbox proves you own the address, typing the new password proves you know it. Sends go through the same per-recipient throttle as everything else.
- [x] ~~Branch protection on `main`~~ — done: direct pushes are refused, changes go through a pull request, and all three CI jobs must pass before it can merge. `enforce_admins` is on, so that applies to the repo owner too — which is the entire point, since a solo repo where the owner can push straight past a red build has advisory CI, not enforced CI. Approvals are set to 0 rather than 1, because GitHub won't let you approve your own PR and a solo repo requiring one approval can never merge anything. Turn it off in Settings → Branches if it ever gets in the way.
- [x] ~~Decide what to do about email delivery~~ — **decided: not doing it.** Resend's default sender only delivers to the Resend account owner; reaching anyone else needs a domain verified at resend.com/domains, and a domain costs money. This is a portfolio project, so that spend isn't justified — and every provider worth using has the same requirement, so there's no free way around it rather than a cheaper one I've missed.

  What that means in practice: the verification email works, and you can watch it work by signing up with the Resend account owner's address. Any other address gets a 403 that's logged server-side and never reaches an inbox. Nothing gates on being verified — signup, login and the whole app work regardless — so this costs a trust badge, not a feature.
- [x] ~~Session revocation~~ — done: the cookie carries a signed epoch, checked against the user's row on every authenticated request and on the WebSocket upgrade. A password reset bumps it, and there's a `logout-everywhere` endpoint. The honest cost is one indexed lookup per request; there's no stateless way to revoke something, so that was the price of the feature rather than an implementation detail.

- [x] ~~Sign out everywhere~~ — done: a confirmed control on the Profile screen ends every session for the account, this device included. The endpoint shipped a day before the UI did, which meant the feature existed and nobody could reach it.
- [x] ~~React and TypeScript audit~~ — done: the last unreviewed part of the codebase. Turned up one real bug — the client answered the server's "slow down" with another subscribe, in a one-for-one loop — plus two timers outliving their components and a `memo()` that was being defeated from an unrelated screen. See [docs/REVIEW-FINDINGS.md](docs/REVIEW-FINDINGS.md).

**Still open:**

- [ ] **`typescript` 6 → 7.** Held, not skipped: typescript-eslint's current release (8.67) declares `typescript ">=4.8.4 <6.1.0"` and hard-throws `does not support TS 7.0` at config load, so taking 7 today means shipping with no linting — and lint is a CI gate. Revisit when typescript-eslint ships TS 7 support.

## 📄 Licence

MIT — see [LICENSE](LICENSE).

## 🧰 Tech stack

- **Frontend**: React 19, TypeScript 6, Vite 8 (Rolldown), CSS Modules
- **Backend**: Node.js 20, Express 5, TypeScript 6, `ws`
- **Database**: Postgres via Prisma 7 (`@prisma/adapter-pg`)
- **Validation**: Zod
- **External API**: Massive (REST + WebSocket), formerly Polygon.io
- **Hosting**: Render — web service, static site, and managed Postgres, all declared in `render.yaml`

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:16A34A,50:0F172A,100:020617&height=100&section=footer" width="100%" alt="footer" />
</div>
