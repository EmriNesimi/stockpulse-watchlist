<div align="center">

<img src="https://capsule-render.vercel.app/api?type=soft&color=0:0D0C2B,50:4B21B0,100:8044FE&height=180&section=header&text=StockPulse&fontSize=54&fontColor=FFFFFF&fontAlignY=35&animation=fadeIn&desc=live%20tickers.%20a%20real%20portfolio.%20no%20fake%20data%20labeled%20as%20real.&descAlignY=58&descSize=16&descAlign=50" width="100%" alt="StockPulse banner" />

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=500&size=18&duration=2200&pause=800&color=8044FE&background=FFFFFF00&center=true&vCenter=true&width=620&lines=%24+watching+AAPL...+%2B0.34%25;%24+position%3A+12+shares+%40+%24300.00;%24+profit%3A+%2B%24425.40+(%2B11.82%25);%24+connection%3A+live" alt="Terminal-style typing animation" />

<br /><br />

![React](https://img.shields.io/badge/React-181717?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-181717?style=flat-square&logo=typescript&logoColor=3178C6)
![Express](https://img.shields.io/badge/Express-181717?style=flat-square&logo=express&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-181717?style=flat-square&logo=socketdotio&logoColor=00FF9C)
![Prisma](https://img.shields.io/badge/Prisma-181717?style=flat-square&logo=prisma&logoColor=5A67D8)
![Postgres](https://img.shields.io/badge/Postgres-181717?style=flat-square&logo=postgresql&logoColor=4169E1)
![Massive](https://img.shields.io/badge/Massive-181717?style=flat-square&logoColor=16A34A)
[![CI](https://github.com/EmriNesimi/stockpulse-watchlist/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/EmriNesimi/stockpulse-watchlist/actions/workflows/ci.yml)
[![Smoke](https://github.com/EmriNesimi/stockpulse-watchlist/actions/workflows/smoke.yml/badge.svg)](https://github.com/EmriNesimi/stockpulse-watchlist/actions/workflows/smoke.yml)

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
- [Logs](#-logs)
- [Smoke test](#-smoke-test)
- [Backups](#-backups)
- [Deployment](#-deployment)
- [API reference](#-api-reference)
- [Environment variables](#️-environment-variables-backendenv)
- [Security notes](#-security-notes)
- [Roadmap](#️-roadmap)
- [Licence](#-licence)
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
- 🔌 **Runs without an API key** — no Massive account and no config needed; it boots on the simulated price feed and a static ticker-search list. It does need a Postgres to talk to, since accounts live there — see [Setup](#-setup) for the one-line container.
- ♿ **Accessible by default** — throttled screen-reader announcements, keyboard support, visible focus states, and full `prefers-reduced-motion` compliance. Audited against WCAG 2.2 AA rather than assumed; see [Accessibility](#-accessibility) for what that audit found and what's still open.
- ⚠️ **Visible failure states** — a failed watchlist load, ticker add, or alert creation now surfaces as a dismissible error toast instead of failing silently, and the watchlist table distinguishes "loading" from "genuinely empty" on first load.
- 🔐 **Real multi-user accounts** — email/password signup and login (scrypt-hashed, signed session cookie), each user gets their own private watchlist and alerts. Price ticks stay public over the WebSocket (they're just market data), but price-alert notifications are routed only to the connection belonging to the alert's owner.
- ✉️ **Verification, reset, and sign out everywhere** — a verification email on signup (a trust badge, never a wall: nothing is gated on it), forgot/reset-password by emailed one-hour token, and a Profile control that ends every session for the account, open WebSockets included. The reset endpoint answers identically for a known and unknown address, so it can't be used to enumerate accounts.

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
- **Backend**: Express API, Prisma/Postgres persistence, Massive ticker search proxy (with a static fallback list and a free-tier-aware rate limiter), a simulated real-time price engine, real Massive WebSocket integration (with automatic graceful fallback if the key isn't entitled), a WebSocket broadcaster that fans price ticks out to connected clients with per-IP rate limits and per-connection size/subscription limits, and real multi-user auth (scrypt password hashing, signed session cookies, per-user watchlists/alerts). Since the initial build: one-shot price alerts evaluated per tick, OHLC history for the chart, email verification and password reset over Resend, session revocation that also drops a user's open WebSockets, a public endpoint for browser crash reports, and structured JSON logging with one line per request.
- **Frontend**: Vite + React + TS app built against a Figma trading-dashboard reference — a login/signup gate, a sidebar shell with Dashboard/Wallet/Profile/Stock screens, portfolio cards and a watching rail, debounced ticker search wired to the real API, a watchlist table with sparklines, a live WebSocket client with reconnect/backoff, per-row LIVE/SIM badges, a connection-status indicator, and a light/dark theme toggle. Since then: a hand-rolled SVG candlestick chart per symbol, inline price-alert creation and fired-alert toasts, holdings entry with portfolio maths, forgot/reset-password and verify-email flows in the auth gate, an error boundary plus uncaught-error reporting to the backend, runtime validation of both WebSocket messages and the REST responses whose numbers reach arithmetic, and the light theme brought up to WCAG 2.2 AA.
- **Accessibility**: throttled `aria-live` price announcements, a skip link, Escape-to-dismiss on search, visible focus states, `prefers-reduced-motion` support, and color-paired (never color-only) up/down indicators.
- **Testing**: 741 tests total — 307 on the backend (schemas → `PriceFeed` → routes → WS broadcaster → price alerts → history → env var fail-fast behavior → auth routes/rate-limiting → alert-delivery user scoping → watchlist size cap → verification, password reset and revocation reaching open sockets → the mail throttle → crash reports, health and logging, all wired into CI) and 434 on the frontend (hooks, API client, portfolio maths, WebSocket message validation, every component and screen, and an `App.tsx` integration suite covering the real wiring between them). See [Setup](#-setup) for how to run them.
- **Security/CI**: see [Security notes](#-security-notes) below — all audits clean, no secrets in history, CI green.

## 🏗️ Architecture

```
┌─────────────────┐   REST (/api/auth, /watchlist, /alerts, /search, /history)
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
                                              │   OHLC history;  │               │   PriceAlert)          │
                                              │   rate-limited)  │               │                        │
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
│   │   ├── server.ts              # http server + WS broadcaster; SIGTERM drains for 10s then exits, so a Render deploy doesn't drop sockets mid-frame
│   │   ├── app.ts                 # Express app: trust proxy (one hop), request log first, helmet, CORS, two rate limiters, routes (+ .cors.test.ts, health.test.ts)
│   │   ├── env.ts                 # env var loading: dev fallbacks outside production, hard throw on a missing required var inside it (+ .test.ts)
│   │   ├── db.ts                  # Prisma client singleton over the pg driver adapter (Prisma 7 no longer reads the URL from the schema)
│   │   ├── asyncHandler.ts        # Express 4 leftover - 5 forwards async rejections itself; kept so the two can't both react
│   │   ├── logger.ts              # structured JSON logging (+ .test.ts)
│   │   ├── requestLogger.ts       # one line per finished request (+ .test.ts)
│   │   ├── watchlistHelper.ts     # shared getOrCreateWatchlist() - an upsert, so a first visit loading two lists at once can't race itself into a 500
│   │   ├── wsLimits.ts            # MAX_SYMBOLS_PER_CLIENT (30) - shared between the WS broadcaster and the watchlist size cap
│   │   ├── auth/
│   │   │   ├── password.ts        # scrypt hash/verify with a per-password salt, constant-time compare (+ .test.ts)
│   │   │   ├── session.ts         # signed cookie userId.epoch.hmac - the epoch is what makes sign-out-everywhere possible (+ .test.ts)
│   │   │   ├── middleware.ts      # attachUserId (always runs, checks the cookie's epoch against the user's) + requireAuth (401s if not signed in) (+ .epoch.test.ts)
│   │   │   ├── verification.ts    # 24h email verification token
│   │   │   └── passwordReset.ts   # 1h reset token - shorter on purpose, it hands over the account
│   │   ├── email/
│   │   │   ├── resend.ts          # Resend's HTTP API via fetch, plus the email templates (+ .test.ts)
│   │   │   └── sendThrottle.ts    # per-recipient cooldown on outbound mail (+ .test.ts)
│   │   ├── routes/
│   │   │   ├── auth.ts                    # signup/login/logout/logout-everywhere/me, verify-email + resend, forgot/reset-password (seven .test.ts files: routes, cookie, ratelimit, reset, resend, logoutEverywhere, schemas)
│   │   │   ├── auth.schemas.ts            # credentials, forgot-password, reset-password and token schemas; z.email() pipes through trim first (+ .test.ts)
│   │   │   ├── watchlist.ts               # GET/POST/PATCH/DELETE - PATCH sets or clears a position - zod-validated, requires auth, 409 at the 30-ticker cap (+ .routes.test.ts, real db)
│   │   │   ├── watchlist.schemas.ts       # symbolSchema (uppercased, 1-6 letters with an optional .X/-X suffix), addItem, updateHoldings; shares capped at 1e9 (+ .test.ts)
│   │   │   ├── search.ts                  # Massive ticker search proxy; serves the static list instead when there's no key or the 4/min budget is spent, and source: says which (+ .routes.test.ts)
│   │   │   ├── search.schemas.ts          # ?q= trimmed, 1-50 chars (+ .test.ts)
│   │   │   ├── alerts.ts                  # GET/POST/DELETE price alerts, requires auth; DELETE is a deleteMany scoped to the caller's watchlist, so another user's id just 404s (+ .routes.test.ts)
│   │   │   ├── alerts.schemas.ts          # symbol, threshold (positive, finite, ≤ $10M), direction "above" | "below" (+ .test.ts)
│   │   │   ├── history.ts                 # GET OHLC candles per symbol - Massive when it answers, generated candles when it doesn't, and the response says which (+ .routes.test.ts)
│   │   │   ├── history.schemas.ts         # ?days= coerced to an int, 7-365, default 30 (+ .test.ts)
│   │   │   ├── clientErrors.ts            # POST: where a crash in someone's browser gets reported (+ .test.ts)
│   │   │   └── clientErrors.schemas.ts    # every field length-capped - it's public and takes what a browser sends
│   │   ├── alerts/
│   │   │   └── checkAndTriggerAlerts.ts   # evaluates a tick against active alerts; claims each with triggeredAt: null in the where so two ticks can't fire it twice, notifies per alert (+ .test.ts)
│   │   ├── massive/
│   │   │   ├── fallbackTickers.ts # static list of 30 large-caps, used when there's no API key or the quota is spent
│   │   │   ├── fetchHistory.ts    # real Massive aggregates endpoint for OHLC candles; null on no key, quota or rejection, with a warn line each time (+ .test.ts)
│   │   │   └── rateLimiter.ts     # sliding-window limiter capped at 4/min, one under the free tier's 5, so search-as-you-type plus previous-close lookups never ride the line (+ .test.ts)
│   │   ├── priceFeed/
│   │   │   ├── PriceFeed.ts               # the interface: subscribe(symbol, onTick) returns an unsubscribe, and that's all a feed has to do
│   │   │   ├── SimulatedFeed.ts           # default — 1.5s random walk per symbol, seeded from Massive's previous close when a key allows and a deterministic per-symbol price otherwise (+ .test.ts)
│   │   │   ├── MassiveLiveFeed.ts         # real wss://socket.massive.com/stocks feed; on auth failure, timeout or error status it moves every subscriber to a SimulatedFeed and stays there (+ .test.ts)
│   │   │   ├── previousClose.ts           # shared REST helper for seeding base prices; null on no key or quota, logged, so the caller substitutes a deterministic seed (+ .test.ts)
│   │   │   ├── deterministicBasePrice.ts  # per-symbol seed shared by SimulatedFeed + simulatedHistory: a string hash mapped into $20-$500, so a symbol's fake price and fake chart agree
│   │   │   ├── simulatedHistory.ts        # simulated OHLC candle generator, seeded per symbol so re-requesting gives the same chart, YYYY-MM-DD times like the real one (+ .test.ts)
│   │   │   └── index.ts                   # createPriceFeed(): MassiveLiveFeed iff a key is set, SimulatedFeed otherwise - always safe, since the live feed falls over on its own
│   │   ├── test/
│   │   │   └── globalSetup.ts     # resets the throwaway Postgres schema before the route tests; refuses any non-local DB
│   │   └── ws/
│   │       ├── broadcaster.ts     # WS server: origin check, session from the upgrade cookie, per-IP message budget + connection cap, per-connection symbol/size caps, user-scoped alert delivery, 1008 on revocation (+ .test.ts, .limits.test.ts, .origin.test.ts)
│   │       ├── revocation.ts      # lets the auth routes cut off a user's live sockets on logout-everywhere / reset (+ .test.ts)
│   │       └── testHelpers.ts     # FakePriceFeed + fakeTick, startTestServer, connectClient (optional session cookie), MessageCollector, closeAndSettle
│   ├── prisma/
│   │   ├── schema.prisma          # User, Watchlist, WatchlistItem, PriceAlert models
│   │   └── migrations/            # three so far: init, add_password_reset, add_session_epoch
│   ├── prisma.config.ts           # where the connection URL lives now - Prisma 7 removed datasource.url from the schema
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # auth-status gate — checking/AuthGate/Dashboard — plus reading ?token= (verify) and ?reset= off the URL, since there's no router (+ .test.tsx, integration suite)
│   │   ├── Dashboard.tsx                # authenticated shell: owns watchlist + live ticks, swaps views, removes optimistically and rolls back on a rejected delete — remounted per key={user.id}
│   │   ├── App.module.css               # shell layout (sidebar + content column + top bar)
│   │   ├── views/                       # one file per screen, each with a .test.tsx and .module.css
│   │   │   ├── DashboardView.tsx        # composes StatsRow, PortfolioCards, SymbolChartPanel + FavoritesList, WatchlistTable - layout only, no state of its own
│   │   │   ├── WalletView.tsx           # portfolio totals and per-holding breakdown; a total with any holding still waiting on its first tick renders as a dash, not a partial sum
│   │   │   ├── ProfileView.tsx          # account details, verification banner, inline holdings entry, and the confirmed sign-out-everywhere control
│   │   │   └── StockDetailView.tsx      # per-symbol screen: SymbolChartPanel, the position, and an AlertForm
│   │   ├── main.tsx                     # installs uncaught-error reporting before the first render, then StrictMode > ErrorBoundary > App
│   │   ├── types.ts                     # PriceState: price, changePercent, source "live" | "simulated", and the rolling history the sparkline draws
│   │   ├── index.css                    # Inter from Google Fonts, tokens import, then the globals: tabular-nums, sr-only, skip-link, spin, and the blanket prefers-reduced-motion rule
│   │   ├── styles/tokens.css            # design tokens: light set on :root, dark set under [data-theme="dark"], with the contrast ratio noted beside every value that moved for AA
│   │   ├── components/          # every component here has a matching .test.tsx and .module.css, except WatchlistRow (see its line)
│   │   │   ├── Search.tsx               # ticker search debounced at 300ms; result count announced through a role="status" span, Escape clears, disabled with a message at the 30-ticker cap
│   │   │   ├── WatchlistTable.tsx       # symbol/price/change/sparkline/remove/alert-bell; loading vs genuinely-empty states; focusable scroll region so it reflows at 320px
│   │   │   ├── WatchlistRow.tsx         # one memo()'d row, split out so holdings edits elsewhere don't re-render every row; tested and styled through WatchlistTable
│   │   │   ├── StatsRow.tsx             # tracking / gainers / losers / average change, all derived from the watchlist and prices in memory; an exactly-zero change counts as a gainer, by decision and by test
│   │   │   ├── PriceCell.tsx            # price + LIVE/SIM badge + tick flash; the flash is a supporting cue beside the arrow, never the only signal, and off under prefers-reduced-motion
│   │   │   ├── Sparkline.tsx            # inline SVG price history, role="img" with a label derived from the data; under two points it says so instead of drawing a dot (SVG presentation attrs, not CSS Modules — nothing to scope)
│   │   │   ├── CandlestickChart.tsx     # inline SVG OHLC chart; role="img" with a data-derived label, role="status" while loading, role="alert" on error
│   │   │   ├── SymbolChartPanel.tsx     # chart + live price header + 1W/1M/3M/6M/1Y pills mapped to 7-365 days for useHistory
│   │   │   ├── Sidebar.tsx              # persistent <nav aria-label="Main">, aria-current="page" on the active item; collapses to an icon rail under 1000px with the labels kept for screen readers
│   │   │   ├── PortfolioCards.tsx       # one card per open position, coloured by the position's return rather than the day's tick
│   │   │   ├── FavoritesList.tsx        # compact watching rail beside the chart; each entry is a real button that opens that symbol's screen
│   │   │   ├── HoldingsForm.tsx         # inline shares/cost-basis entry; both fields or neither, so a position is never half-entered
│   │   │   ├── TickerAvatar.tsx         # deterministic coloured initials (no fake brand logos): first two letters before any ./- suffix, hue from lib/tickerColor, aria-hidden because the symbol text sits beside it
│   │   │   ├── ThemeToggle.tsx          # light/dark switch whose aria-label names the mode it would switch *to*
│   │   │   ├── ConnectionBadge.tsx      # WS connection status indicator, a role="status" so a drop is announced without stealing focus
│   │   │   ├── AlertForm.tsx            # inline threshold/direction form, opened via the bell icon; rejects anything outside $0.01-$10M in the handler, not via native validation, which a paste can skip
│   │   │   ├── AlertToast.tsx           # dismissible toast for fired price alerts; a role="log" container with one role="alert" per toast, so each is announced once
│   │   │   ├── ErrorToast.tsx           # dismissible toast for a failed load, add, remove or alert-create, and for WebSocket errors
│   │   │   ├── ErrorBoundary.tsx        # catches a render crash, reports it to /api/client-errors, shows a reload prompt instead of a blank page (a class, since there's still no hook for componentDidCatch)
│   │   │   ├── VerificationBanner.tsx   # "resend verification email" for unverified accounts, a role="status" region; gates nothing
│   │   │   └── AuthGate.tsx             # login/signup/forgot/reset form in one component, renders in place of the app until signed in
│   │   ├── hooks/
│   │   │   ├── useTheme.ts              # light/dark, persisted to localStorage - and tolerant of it throwing, which it does when site data is blocked (+ .test.ts)
│   │   │   ├── useDebouncedValue.ts     # generic trailing debounce; Search feeds it the query at 300ms (+ .test.ts)
│   │   │   ├── useLiveTicks.ts          # WS client: subscribe diffing, 2s→15s reconnect backoff, 5s error-resync cooldown, 1008 = signed out, alert events (+ .test.ts)
│   │   │   ├── useHistory.ts            # fetches candles for SymbolChartPanel; null symbol means don't fetch, and clears loading if the symbol goes away mid-flight (+ .test.ts)
│   │   │   ├── useErrorToasts.ts        # dismissible/auto-expiring error toast state; stable pushError, timers cleared on unmount (+ .test.ts)
│   │   │   └── useThrottledAnnouncement.ts  # aria-live summary, throttled to 1/8s (+ .test.ts)
│   │   ├── lib/
│   │   │   ├── api.ts                   # fetch wrappers for the backend REST API, credentials: "include", responses run through apiShapes before anything does maths on them (+ .test.ts)
│   │   │   ├── apiShapes.ts             # runtime validation of REST responses whose numbers reach arithmetic (+ .test.ts)
│   │   │   ├── wsMessages.ts            # runtime validation of everything the WebSocket sends (+ .test.ts)
│   │   │   ├── guards.ts                # the primitive type guards both validators share (+ .test.ts)
│   │   │   ├── holdings.ts              # portfolio maths: toHoldings, valueHolding, portfolioTotals - a value is undefined until its price has ticked, never zero (+ .test.ts)
│   │   │   ├── format.ts                # currency/percent/share formatting, signedDirection (+ .test.ts)
│   │   │   ├── tickerColor.ts           # deterministic avatar colour per symbol (+ .test.ts)
│   │   │   ├── uncaught.ts              # reports the failures the error boundary never sees (+ .test.ts)
│   │   │   ├── views.ts                 # the View union the shell navigates over
│   │   │   ├── ws.ts                    # WS_URL derived from API_BASE by swapping http(s) for ws(s), so one env var drives both (+ .test.ts)
│   │   │   └── limits.ts                # MAX_WATCHLIST_SYMBOLS (30) - mirrors backend/src/wsLimits.ts (+ .test.ts, which checks the mirror)
│   │   └── test/
│   │       └── setup.ts                 # jest-dom matchers, and an explicit afterEach(cleanup) - Testing Library only auto-registers it with test.globals on
│   ├── vite.config.ts               # dev server + a build-only plugin that injects the CSP meta tag with the real API and WS origins
│   └── vitest.config.ts             # jsdom, 15s timeout, and fs.allow one directory up so limits.test.ts can read the backend's source
├── .github/
│   ├── workflows/ci.yml         # secret grep, then typecheck/lint/build/test/audit per package (backend against a real Postgres)
│   ├── workflows/smoke.yml      # hits the deployed app after a push to main and daily - see Smoke test
│   └── dependabot.yml           # weekly grouped minor/patch bumps per package; majors deliberately excluded
├── scripts/
│   ├── smoke.sh                 # the nineteen read-only checks smoke.yml runs; API_URL/APP_URL point it elsewhere
│   └── backup-db.sh             # pg_dump via the postgres:18 image, gzipped
├── docs/REVIEW-FINDINGS.md      # the three audits: what they found, what was fixed, what they missed
├── render.yaml                  # both services and the database, as a Render Blueprint
├── SECURITY.md                  # how to report, and what's already known
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
| `--color-foreground-muted` | ![#6b6b7a](https://placehold.co/14x14/6b6b7a/6b6b7a.png) | `#6b6b7a` | ![#9494a6](https://placehold.co/14x14/9494a6/9494a6.png) | `#9494a6` | labels, secondary text |
| `--color-accent` | ![#8044fe](https://placehold.co/14x14/8044fe/8044fe.png) | `#8044fe` | ![#9b6bff](https://placehold.co/14x14/9b6bff/9b6bff.png) | `#9b6bff` | CTAs, active nav |
| `--color-accent-soft` | ![#f7f3ff](https://placehold.co/14x14/f7f3ff/f7f3ff.png) | `#f7f3ff` | ![#241a3d](https://placehold.co/14x14/241a3d/241a3d.png) | `#241a3d` | active/hover fills |
| `--color-bullish` | ![#077a4e](https://placehold.co/14x14/077a4e/077a4e.png) | `#077a4e` | ![#26c281](https://placehold.co/14x14/26c281/26c281.png) | `#26c281` | price up, profit |
| `--color-bearish` | ![#c42318](https://placehold.co/14x14/c42318/c42318.png) | `#c42318` | ![#f0554b](https://placehold.co/14x14/f0554b/f0554b.png) | `#f0554b` | price down, loss |
| `--color-border` | ![#ececf0](https://placehold.co/14x14/ececf0/ececf0.png) | `#ececf0` | ![#262636](https://placehold.co/14x14/262636/262636.png) | `#262636` | dividers |
| `--color-input-border` | ![#8e8e99](https://placehold.co/14x14/8e8e99/8e8e99.png) | `#8e8e99` | ![#63637a](https://placehold.co/14x14/63637a/63637a.png) | `#63637a` | resting form-field boundary — `--color-border` is decorative at 1.1:1, a control needs 3:1 (SC 1.4.11) |

</div>

A separate `--color-on-accent` (always `#ffffff`) carries text sitting on the accent or on a ticker avatar, since those fills stay saturated in both themes. Reusing `--color-on-primary` there put near-black text on violet in dark mode — that was a real bug, and this token is the fix.

Font: **Inter**. Icons: **Phosphor** (`@phosphor-icons/react`), no emoji in the UI itself. Prices use `font-variant-numeric: tabular-nums` so digits don't jitter as values update. Micro-interactions run 150–300ms with `ease-out`, respecting `prefers-reduced-motion`. Cards take their lift from a wide, low-opacity shadow rather than a border, matching the reference.

## 🚀 Setup

Requires Node 20.19+ — that's what Vite 8/Rolldown need, and 20 is what everything here is pinned, typed and tested against. The frontend's `engines` also admits 22.12+; the backend's deliberately doesn't, because nothing has been run on 22 (and `jsdom`/`@types/node` below are held back on the assumption it's 20). A `.nvmrc` is committed at the repo root *and* in each package — the root one is what `nvm use` and CI read, and the per-package copies are what Render reads, since it resolves the version file from a service's root directory rather than the repo's.

> **Dependencies deliberately held back**, so nobody "helpfully" bumps them and breaks the build:
>
> - **`jsdom` at 27** — 28+ pulls an `undici` that calls `webidl.util.markAsUncloneable`, a Node 22 API. On the pinned Node 20 the test suite fails to collect at all.
> - **`@types/node` at 20** — types should track the Node major actually being run. Types ahead of the runtime let TypeScript accept calls that don't exist at execution time, which quietly removes the guard rail.
> - **`cookie` at 0.7** — tried v2 and backed it out. The rename (`parse` → `parseCookie`) is trivial and the `node16` migration did fix the types resolution, but underneath both sits the real blocker: **v2 is ESM-only**, and this package emits CommonJS, so `require()` can't load it at all (`TS1479`). Taking it means converting the whole backend to ESM, which is a far bigger change than a dependency bump and buys nothing here — there's no advisory against 0.7. Note the stale `@types/cookie` also has to go when this eventually happens; it shadows v2's own bundled types.
> - **`deepmerge-ts` forced to 8** via an `overrides` entry — Prisma 7's CLI pins 7.1.5, which carries a high-severity stack-exhaustion advisory (GHSA-ggr8-5vv4-36mx). The CLI works fine on 8, and `npm audit` is a CI gate.
> - **`mysql2` forced to 3.24** via the same mechanism — the Prisma CLI pulls it in transitively, and versions below 3.22 carry a high-severity credential-leak advisory (GHSA-3f6p-5ww8-9rcr). This project talks to Postgres and never loads `mysql2` at all, so the exposure is nil either way, but `npm audit` doesn't know that. `npm audit fix --force` "fixes" it by downgrading Prisma to 6, which is worse than the problem.
> - **`js-yaml` forced to ≥4.3.2** in the frontend, same mechanism — `@eslint/eslintrc` resolves 4.3.1 on its own, which sits inside GHSA-2883-xcg3-v3hh (high). Nothing here parses YAML; it's a lint-toolchain transitive, but `npm audit --audit-level=high` doesn't grade on relevance, and `npm audit fix` crashed on it rather than fixing it. The backend took the same bump through its lockfile without needing an override.

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

Backend tests: `cd backend && npm test` (Vitest — schema validation, `SimulatedFeed`'s random walk, the Massive rate limiter, `MassiveLiveFeed`'s full auth/fallback state machine against a mocked WebSocket, the watchlist/search/alerts/history routes via `supertest` against a real throwaway Postgres database, price-alert triggering logic, the simulated OHLC candle generator, the WS broadcaster itself via real socket connections — subscribe/unsubscribe fan-out, the symbol/rate/payload-size limits including the per-IP budget surviving a reconnect, shared-subscription cleanup, and alert delivery — `env.ts`'s production fail-fast behavior via fresh module re-imports, and — added since this paragraph was first written — the whole auth surface: scrypt hashing, cookie signing and the epoch check, signup/login/logout/logout-everywhere, verification and its resend, password reset, per-route rate limits, revocation reaching open sockets, the per-recipient mail throttle, the Resend client, the crash-report endpoint, the health check's database probe, and both loggers. 307 tests total, no real network calls anywhere in the suite).

The suite drops and recreates the schema before every run, so it refuses to start against anything that isn't localhost — that guard is the only thing standing between a stray `DATABASE_URL` and your production data. See `src/test/globalSetup.ts`.

Frontend tests: `cd frontend && npm test` (Vitest + Testing Library + jsdom — the debounce/throttle hooks with fake timers, the API client's request-building and error handling with a stubbed `fetch`, `useLiveTicks` against a hand-built fake matching the browser `WebSocket` API, `useHistory` and the `CandlestickChart` it feeds, `useErrorToasts` and the `ErrorToast` it feeds, every component, and an `App.tsx` integration suite that mounts the real component tree — only the REST API client and the WebSocket global are faked — covering the initial load and its loading state, search → add, optimistic remove + rollback, live connection status and price updates, both halves of the alert feature, and the three error-toast failure paths, end to end. Plus, under `lib/`: the formatters and `signedDirection`, portfolio maths, the ticker colour hash, the WebSocket-message and REST-response validators and their shared guards, uncaught-error reporting, and two guards that aren't about the app at all — one that fails if `react` and `react-dom` ever disagree on version, one that reads the backend's source to check the two mirrored limits still match. 434 tests total.)

The backend needs no **environment variables** — it boots on the simulated price feed and a static ticker-search fallback list automatically, and you don't need a Massive account to run or demo this. It does need the Postgres above: without one, signup returns a 500 and the auth gate makes the app unreachable. That was free when this used SQLite and stopped being free at the migration.

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

This works from `wscat` because a non-browser client sends no `Origin` header, and the upgrade allows that. A browser page on any origin other than `FRONTEND_ORIGIN` sends one and is refused — so if you're poking at it from a devtools console on some other site, that's why.

## 🌿 Contributing to this repo

`main` is protected: no direct pushes, and the secret scan plus both package pipelines have to be green before a pull request can merge. That applies to the repo owner too — protection that the owner can walk past isn't protection.

```bash
git switch -c your-branch
# ...work, commit...
git push -u origin your-branch
gh pr create --fill && gh pr merge --squash
```

Squash on merge is the convention: a branch's granular commits are the record while it's being reviewed and bisected, and `main` gets one commit per PR. Both #59 and #60 went in that way.

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
| Auth notices appearing together with their live region | announced inconsistently; the region is now always present and the text swaps |
| Resting input boundary against its card | 1.07:1 — now a dedicated token at 3.24:1 |
| Watchlist table clipped by the card's `overflow: hidden` | no escape hatch at 320px or 400% zoom |
| `<aside>` announcing primary nav as complementary | now a plain wrapper; the inner `<nav>` does the work |

Ratios were computed from the token hex values and re-derived independently rather than taken from the audit on trust — which was worth doing, since one reported failure (accent text on white, claimed 4.06:1) actually measures **5.03:1** and passes. The dark theme was measured too and already cleared AA everywhere, so only light-theme values moved.

**Still open, honestly:**

- **Nothing has been tested with an actual screen reader.** Every finding above was read out of the code or computed from token values. That catches missing labels and bad contrast; it does not catch a live region that announces at the wrong moment, or a focus order that is technically correct and still disorienting. A VoiceOver and NVDA pass is the obvious next step and hasn't happened.
- **The reflow fix wasn't measured.** The watchlist table was clipped by the card's `overflow: hidden`, and the escape hatch matches the pattern `WalletView` already uses — but SC 1.4.10 is a claim about 320px and 400% zoom, and neither was put in front of a browser to confirm it now holds.
- ~~React correctness and type safety have never been independently reviewed.~~ Done on 2026-08-31 — one real bug (the resubscribe loop), two timers outliving their components, a defeated `memo()`. See [docs/REVIEW-FINDINGS.md](docs/REVIEW-FINDINGS.md). Kept here struck through because this list is where it was promised.

## 🐛 Known issues

**A fix can land and not ship.** `format.ts` stopped signing a move too small
to show on 2026-09-09. Seven other places built the same string, or the arrow
and colour beside it, by hand — so the bug stayed live in the main watchlist
table, the wallet, the stats row and the spoken summary for days, while a
passing suite reported it fixed.

Finding them took three passes, and the second one is the instructive part: I
grepped `changePercent ?? 0) >= 0`, found three call sites, fixed them, and
wrote that the pattern was gone. Four more were doing the same thing to a
money amount, so the grep didn't match them. The evidence was narrower than
the claim it was supporting.

What actually closes it is that `grep "?? 0) >= 0"` and `grep '$${...toFixed(2)}'`
both return nothing now, and `signedDirection` is the only thing deciding
which way a number points. Worth re-running both before believing the next
shared-formatter fix is complete.

Postscript, 2026-09-15: there was an eighth. The screen-reader summary
decided "up"/"down" with a plain `>= 0` and its own `< 0.005` flat check —
no `?? 0`, no `toFixed`, so neither grep matched it. It goes through
`signedDirection` now, and the grep that would have caught it is
`grep -rn '"up" : "down"' src` returning only `format.ts` (and `PriceCell`'s
tick flash, which compares two raw prices and is fine).

**The price chart was broken in production and the tests said it was fine.**
Worth writing down, because the interesting part isn't the bug.

`Candle.time` is a `"YYYY-MM-DD"` string on the backend. The frontend typed it
as `number`, and the response validator — added to stop malformed numbers
reaching a render — checked it with `isFiniteNumber`. Every real candle failed
validation, so `getHistory` threw `ResponseShapeError` on every load. That is
every chart, every user, for as long as the validators had existed.

389 tests passed over it. Every candle fixture in the suite used `time: 1`,
written to satisfy the frontend type — which was the thing that was wrong. The
tests agreed with the type, the type disagreed with the server, and nothing in
between ever compared the two. A fixture that mirrors your own mistaken
assumption tests nothing at all.

It's now pinned at both ends: the backend asserts the runtime types it puts on
the wire, and the frontend's regression test parses a body copied from a live
response. The smoke test checks the shape too, though only the server's half.


**The backend suite is intermittently red.** Three separate runs failed this week, each on a different test, each passing alone and passing again on a rerun — so a failure here is worth rerunning once before believing it.

What's been ruled out, with measurements rather than guesses:

- **Not connection exhaustion.** Sampled `pg_stat_activity` throughout a full run: it peaks at **2** connections against a limit of 100.
- **Not just the timeout.** The default 5s was too tight for tests that drive real timers, and both suites now allow 15s — but one run still failed after that change, so the timeout was a contributing factor at most.

- **Not a cross-file ordering effect, on the evidence available.** The suite was run **25 times consecutively on an idle machine: 25 passes, 0 failures.** If the cause were ordering between the nine files that share the database, it should have appeared.

What's left is the thing all three observed failures had in common: each happened while the machine was busy with something else — a Docker start, the frontend suite, browser automation — and each failed test was slow rather than wrong, then passed alone and passed on a rerun. That points at contention rather than a race, which is also why raising the timeout helped without fully fixing it.

**Then it reproduced, and the cause was visible.** Three frontend tests failed mid-session with reported durations around **365 seconds** against a 15s timeout. Load average at that moment was **20.4**, with a single vitest process running — the machine was busy with macOS's `XprotectService` malware scan plus assorted background work, not with anything this project was doing. Once load dropped below 6, the same suite passed 322/322 unchanged.

So: not a race, not ordering, not connection exhaustion. The suite is CPU-starved on a loaded machine, and `userEvent`-driven tests advancing real timers per keystroke are the first to tip over.

Practical upshot: **rerun before believing a local failure**, and check `uptime` if it repeats. This is a developer-machine problem rather than a code one — CI runs on a dedicated runner and has not shown it.

## 🪵 Logs

The backend writes one line of JSON per event to stdout, which Render captures.

```json
{"level":"warn","time":"2026-09-07T16:39:30.209Z","message":"Massive WS refused, falling back to the simulated feed","reason":"auth_failed"}
```

Every fallback to fabricated data now says so. Previous-close lookups and
history requests both answer `null` on failure and let the caller substitute
simulated numbers, which is the right behaviour and was previously invisible —
a Massive outage swapped real candles for generated ones and left no trace.
The health check logs its cause too, so a 503 that pulls the instance out of
Render's rotation isn't just an absence of traffic.

The point is the fields. Everything used to go out as a sentence with the
interesting part baked into the middle of it — `Failed to send verification
email to someone@example.com` — so "is one address failing every send?" meant
reading lines rather than grouping them. Now the address, the symbol, the
fallback reason and the request path are all things you can filter on.

Errors keep their stack. `JSON.stringify` turns an `Error` into `{}`, which
loses the only part worth logging, so the serialiser unwraps them.

Every request is logged too — method, path, status and duration — at a level that follows the status: 5xx errors, 4xx warnings, and anything over a second warns as slow even when it succeeded. A healthy `/health` is skipped, because Render polls it and the daily smoke run hits it, and together they'd be most of the log by volume.

It's four functions over `console` in `src/logger.ts` rather than a logging
library — the platform captures stdout either way, so a dependency would be
buying formatting alone. Silent under `NODE_ENV=test`, so the suite doesn't
bury its own failures.

## 🔥 Smoke test

Render builds from `main` on its own, outside CI — so a green pipeline says the *code* is fine and nothing at all about whether the *deployed app* is.

```bash
./scripts/smoke.sh
```

Nineteen checks against the live deployment: health including the database, auth on a protected route, search, the crash-report endpoint accepting a good body and rejecting a bad one, history returning real candles with the right shapes, CORS in both directions, the SPA fallback, the security headers, a real WebSocket round trip (connect, subscribe, receive a tick), and — the one worth having — whether the shipped JavaScript bundle actually points at this API. `VITE_API_URL` is inlined at build time, so a stale value survives a restart and only a rebuild clears it; there's no way to spot that from outside except by reading the bundle.

It runs automatically after every push to `main` and once a day. Daily matters because the two likeliest ways this deployment breaks involve nobody pushing anything: a service hostname changing (which has happened, and silently breaks CORS) and the free database reaching its expiry.

The WebSocket check covers the app's headline feature, and the upgrade path has its own origin check, session resolution and per-IP caps that no HTTP request touches — a deploy where the socket refuses upgrades looks healthy from every other angle.

Read-only — it creates nothing and signs in as nobody. Point it elsewhere with `API_URL` and `APP_URL`.

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

Five things about deploying this bit, none of which reproduce locally:

- **`npm ci --include=dev` is load-bearing.** The service sets `NODE_ENV=production` because the app needs it at runtime, but npm reads it at *install* time too and skips devDependencies — which is where `typescript`, the Prisma CLI, and every `@types/*` package live. Without the flag `tsc` runs with no type declarations at all and dies on hundreds of implicit-any errors.
- **Migrations run in the build**, via `npm run migrate:deploy`. Deliberately not part of `npm run build`, because CI runs `build` and CI has no business migrating production.
- **The hostnames are pinned.** Render appends a random suffix when a name is already taken globally, which is why the services are `stockpulse-b449` and `stockpulse-api-n3yu` rather than the bare names. `FRONTEND_ORIGIN` and `VITE_API_URL` refer to those exact hosts and must be changed together — a mismatch means CORS rejects every request.
- **The static site rewrites all paths to `index.html`.** There's no client-side router, but the verification email links to `/verify-email?token=...`, and a static host has no file there — clicking the link returned a 404 until the rewrite went in. `App.tsx` only ever reads `?token=` off the query string, so serving `index.html` everywhere is enough.

- **The static site's security headers live in `render.yaml`, not in the app.** `helmet()` only covers the API origin, and `frame-ancestors` can't be set from a `<meta>` CSP — it has to be a real response header. So `X-Frame-Options`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options` and `Referrer-Policy` are declared on the static service, and the smoke test checks three of them are actually being served.

`VITE_API_URL` is read at *build* time, not run time — Vite inlines it into the bundle. Changing it needs a rebuild, not a restart.

## 📖 API reference

### REST

| Method | Path | Body / Query | Response |
|---|---|---|---|
| `GET` | `/health` | — | `200` `{ "status": "ok", "database": "ok" }` · `503` `{ "status": "unavailable" }` if Postgres doesn't answer. Render routes traffic on this, so it runs a real query rather than answering unconditionally — and returns no error detail, since it's public and connection errors quote hostnames and usernames |
| `POST` | `/api/auth/signup` | `{ email, password }` | `202` `{ message }` — identical whether or not the address is already registered, and never sets a session (log in as a separate step) · `400` on invalid input |
| `POST` | `/api/auth/login` | `{ email, password }` | `200` `{ user }` + sets session cookie · `401` on bad credentials (same error either way, doesn't reveal which was wrong) |
| `POST` | `/api/client-errors` | `{ message, stack?, componentStack?, url? }` | `204`. Where a browser crash goes — a render error caught by the boundary, or an unhandled rejection or uncaught throw, which the boundary never sees and which in an app built on fetches is most of what goes wrong. Unauthenticated on purpose, since the crashes worth hearing about are the ones that break the app before anyone can sign in. Every field is length-capped, and it sits under the 60/min limiter · `400` on invalid input |
| `POST` | `/api/auth/logout-everywhere` | — | `204`, ends every session for the account on every device and clears the caller's cookie · `401` if not signed in |
| `POST` | `/api/auth/logout` | — | `204`, clears the session cookie |
| `GET` | `/api/auth/me` | — | `200` `{ user }` · `401` if not signed in |
| `POST` | `/api/auth/verify-email` | `{ token }` | `200` `{ user }` · `400` if the token is unknown, already used, or expired. POST rather than GET because it consumes a single-use token |
| `POST` | `/api/auth/resend-verification` 🔒 | — | `204` · `409` if the address is already verified |
| `POST` | `/api/auth/forgot-password` | `{ email }` | `202` `{ message }` whatever happens — an unauthenticated caller doesn't get to learn which addresses have accounts · `400` on invalid input |
| `POST` | `/api/auth/reset-password` | `{ token, password }` | `204`, and every other session for the account is ended · `400` if the token is unknown, already used, or expired (same answer for all three, same reason). Deliberately doesn't sign you in |
| `GET` | `/api/search` | `?q=<string>` | `{ results: [{ symbol, name }], source: "massive" \| "fallback" }` |
| `GET` | `/api/watchlist` 🔒 | — | `{ items: [{ id, symbol, name, addedAt, shares, costBasis }] }` — `shares`/`costBasis` are `null` for a watched-but-not-held ticker |
| `POST` | `/api/watchlist` 🔒 | `{ symbol, name?, shares?, costBasis? }` | `201` `{ item }` · `409` if already on the list or the watchlist is at its 30-ticker cap · `400` on a bad symbol, or if only one of `shares`/`costBasis` is given |
| `PATCH` | `/api/watchlist/:symbol` 🔒 | `{ shares, costBasis }` — both numbers to set a position, both `null` to clear it | `200` `{ item }` · `404` if the symbol isn't on the list · `400` if only one of the two is `null` |
| `DELETE` | `/api/watchlist/:symbol` 🔒 | — | `204` on success · `404` if it wasn't there |
| `GET` | `/api/alerts` 🔒 | — | `{ alerts: [{ id, symbol, threshold, direction, createdAt, triggeredAt }] }` |
| `POST` | `/api/alerts` 🔒 | `{ symbol, threshold, direction: "above" \| "below" }` | `201` `{ alert }` · `400` on a bad symbol/threshold/direction |
| `DELETE` | `/api/alerts/:id` 🔒 | — | `204` on success · `404` if it wasn't there (including someone else's alert - same response either way) |
| `GET` | `/api/history/:symbol` | `?days=<7-365, default 30>` | `{ candles: [{ time, open, high, low, close, volume }], source: "massive" \| "simulated" }` |

🔒 = requires a signed-in session (`401` otherwise). `/api/search` and `/api/history` stay open since they're not user-specific data; `/health` and `/api/client-errors` stay open because they have to work before anyone can sign in. Everything under `/api` sits behind the 60/min limiter, and `/api/auth/*` behind the 10/min one on top.

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

Limits: 30 subscribed symbols and 2KB max message size per connection; 60 messages/min and 8 concurrent connections per IP address — the budget is per-IP rather than per-connection so hanging up and dialling back doesn't reset it — see [Security notes](#-security-notes). A session revoked while a socket is open (password reset, "sign out everywhere") closes it with code `1008`, and the client treats that as signed-out rather than as a reconnect. The watchlist itself is capped at the same 30 tickers server-side (`POST /api/watchlist` 409s past that), so a client should never actually hit the WS-level symbol cap in normal use — but `useLiveTicks` still handles a `{"type":"error"}` message defensively if it ever does: it forgets what it thinks is subscribed, resends the full desired set after a 5s cooldown (immediately was a loop — the resend itself counted against the budget that had just been exceeded), and surfaces the message as an error toast instead of silently dropping it.

## ⚙️ Environment variables (`backend/.env`)

| Var | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `4000` | |
| `MASSIVE_API_KEY` | no | — | app runs on the simulated feed without it; free tier is rate-limited (5 REST calls/min) and doesn't include real-time WS |
| `DATABASE_URL` | in production | `postgresql://postgres:postgres@localhost:5432/stockpulse_dev` outside production | Postgres connection string |
| `FRONTEND_ORIGIN` | in production | `http://localhost:5173` outside production | locks down CORS to this origin |
| `SESSION_SECRET` | in production | a fixed dev-only value outside production | signs the session cookie (see [Security notes](#-security-notes)) |
| `RESEND_API_KEY` | no | — | without it no mail goes out at all — verification and password-reset alike — and each skipped send is a `warn` line in the log rather than an error; signup, login and reset still answer as if the mail went |
| `RESEND_FROM_EMAIL` | no | `StockPulse <onboarding@resend.dev>` | Resend's shared test sender, which **only delivers to the Resend account owner's own address**. Reaching anyone else needs a verified domain, which this project deliberately doesn't buy — see [Roadmap](#️-roadmap) |

`backend/.env` is gitignored, and no `.env` file of any kind — not even an example/template with blank values — is committed to this repo, to keep the risk surface at zero. The API key never reaches the frontend; all Massive calls happen server-side.

`DATABASE_URL`, `FRONTEND_ORIGIN`, and `SESSION_SECRET` only fall back to their dev defaults when `NODE_ENV` isn't `production`. With `NODE_ENV=production` set, a missing value for any of the three throws at startup instead of silently booting against the wrong database/CORS origin, or - worse, for `SESSION_SECRET` - with a fixed, publicly-known signing key that would let anyone forge a session cookie. See `backend/src/env.ts`.

> **Prisma 7 note:** the connection URL lives in `backend/prisma.config.ts`, not `schema.prisma` — Prisma 7 removed `datasource.url` — and the runtime client is built around a driver adapter (`@prisma/adapter-pg`) rather than a connection string baked into the schema. See `src/db.ts`, which constructs exactly one client for the process so `tsx watch` reloads don't open a new pool each time.

## 🔒 Security notes

- **Secrets**: `MASSIVE_API_KEY` and `SESSION_SECRET` live only in `backend/.env` (gitignored). Never sent to the client. No `.env` file of any kind is committed — not even a blank `.env.example` template — and CI actively fails the build if one ever gets tracked, on top of a separate grep-based backstop for anything that looks like a committed key.
- **Auth**: passwords are hashed with Node's built-in `crypto.scrypt` (random salt per password, `timingSafeEqual` for the comparison) — not bcrypt/argon2, to avoid a native-binding dependency (this project has had enough native-binding trouble already, see the Vite 8/Rolldown note in the roadmap). Sessions are an HMAC-SHA256-signed `httpOnly` cookie containing just the user id. When `FRONTEND_ORIGIN` is https the cookie goes out `SameSite=None; Secure`, because deployed the app and API are separate `onrender.com` subdomains — and `onrender.com` is on the Public Suffix List, so browsers treat them as cross-site and would silently drop a `Lax` cookie on every API call. Locally both ends are `localhost`, which is same-site, so it stays `Lax` there (`Secure` would break it over plain http) — tamper-evident, not encrypted, since there's nothing sensitive in the payload beyond an opaque id. Login returns the same generic `Invalid email or password` whether the account exists or the password was wrong, so a failed login can't be used to enumerate registered emails; signup no longer leaks it either: it answers `202` with the same body whether the address was free or already registered, never returns a session, and hashes the password on both branches so the response *time* doesn't give it away. The only thing that differs is which email goes out, and that lands in the real owner's inbox rather than the submitter's. Both sit behind a tighter rate limit (10/min) than the general API limit. `/api/watchlist` and `/api/alerts` require a valid session and are scoped to the signed-in user; the WS broadcaster resolves the same session cookie on the raw upgrade request (outside the Express middleware chain) so price-alert notifications go only to the alert's owner, never to every client subscribed to that symbol.
- **Password reset**: single-use token, 1-hour expiry, cleared in the same write that sets the new password. Both endpoints answer identically regardless of whether the address or token exists, so neither can be used to enumerate accounts. Resetting also **signs you out everywhere** — see below.
- **Session revocation**: the session cookie is `<userId>.<epoch>.<hmac>`, and the epoch is inside the signed payload rather than appended to it, so a stale cookie can't have its number raised to dodge a revocation. Every authenticated request compares the cookie's epoch against the user's current one — **one indexed lookup per request**, which is a real cost and the reason this wasn't free: revocation needs server-side state to compare against, and no version of it stays stateless. Bumping the epoch invalidates every session that user has open anywhere, which is what `POST /api/auth/logout-everywhere` does and what a password reset now does automatically. Revoking also closes that user's open WebSockets with `1008` — the socket resolves who you are once at the upgrade and caches it, so without that a revoked device kept receiving private alerts on an already-open connection. The client acts on that code as well as on a `401`, because someone watching prices makes no requests, and a silent reconnect would leave them on a dashboard that never updates again. The client treats a `401` from any authenticated request as "this session is gone" and returns to the login screen — otherwise a device whose session was revoked elsewhere sits on a dashboard where every action fails, with an error toast as the only clue. The WebSocket upgrade resolves the session by hand outside the Express chain, so it carries the same check — without it a revoked session kept receiving that user's private alerts on an already-open socket.
- **Client error reports**: `/api/client-errors` is public and writes to the log stream, so every field is length-capped and the whole body is bounded by the 10kb JSON limit. The logger JSON-encodes its fields, so a report full of quotes and newlines can't forge a second log line — there's a test for that rather than a comment claiming it.
- **Input validation**: every REST endpoint validates its input with `zod` before touching Prisma or building a Massive URL. WebSocket subscribe/unsubscribe messages are validated the same way. The client validates in the other direction too — `res.json()` and `JSON.parse` both return `any`, so responses carrying numbers are parsed rather than cast, and a malformed `shares` is rejected instead of quietly poisoning every wallet total.
- **Rate limiting**: `express-rate-limit` on all `/api` routes (60 req/min, 10/min on `/api/auth`, both skipped under `NODE_ENV=test` since the route test files share one app instance across far more requests than either limit allows — see `auth.ratelimit.test.ts` for a test that exercises the real limiter with `NODE_ENV` overridden back); the WS broadcaster caps 30 subscribed symbols and a 2KB message size per connection, and 60 messages/min plus 8 concurrent connections **per IP**. The message budget deliberately outlives the socket: it used to live on per-connection state, which meant hitting the cap and reconnecting handed back a fresh 60 and made the limit decorative. The IP comes from the last `x-forwarded-for` hop, matching the `trust proxy` setting — earlier entries are client-supplied, and trusting them would let anyone choose their own bucket. `POST /api/watchlist` enforces that same 30-symbol number as a hard cap on watchlist size (`409` past it) — without it, a user could add more tickers than a WS connection can ever subscribe to, and the broadcaster would reject the *entire* subscribe batch, not just the extras, silently breaking live prices for their whole watchlist.
- **Headers/CORS**: `helmet` for standard security headers; CORS locked to `FRONTEND_ORIGIN` with `credentials: true` (needed for the session cookie), no wildcard.
- **Dependencies**: lockfiles committed for both workspaces. `npm audit` is clean on both — the frontend used to carry an accepted set of Vite/esbuild dev-server-only advisories, resolved by the Vite 8 upgrade below rather than left as a permanent exception. (Audit actually caught something for real once, separately: CI's audit step failed on a previously-untouched backend commit when a new high-severity advisory landed against a transitive test-tooling dependency — `npm audit` checks live against the advisory database, not just the lockfile, so a clean pipeline can go red with zero code changes if something upstream gets flagged. Patched via `npm audit fix` the same day.)
- **CI**: `.github/workflows/ci.yml` runs typecheck + lint + build + tests + `npm audit --audit-level=high` for both packages on every push/PR, plus a secret-pattern grep over the whole tree. `main` won't merge without all three jobs green.
- **Type safety**: `noUnusedLocals`/`noUnusedParameters` enabled on both `tsconfig.json`s so dead imports/params fail typecheck instead of silently piling up. Prisma error handling uses `instanceof Prisma.PrismaClientKnownRequestError` checks, not untyped `catch (err: any)`.

## 🗺️ Roadmap

Things that would make sense to add next, roughly in order of value:

- [x] ~~Candlestick/OHLC chart on click-through for a single symbol~~ — done: clicking a symbol expands a hand-rolled SVG candlestick chart (same no-dependency approach as the sparkline) fed by a new `useHistory` hook against the existing `/api/history/:symbol` endpoint. Loading/error/empty states covered, and only one chart fetches/renders at a time.
- [x] ~~Price alerts~~ — done: one-shot "notify me when AAPL crosses $200" alerts, evaluated per tick in the WS broadcaster and delivered as a dismissible toast. No test coverage gap left behind either — schema, route, trigger logic, and broadcaster delivery are all covered.
- [x] ~~Multi-user auth~~ — done: email/password signup and login, scrypt-hashed passwords, signed session cookies. `/api/watchlist` and `/api/alerts` require a signed-in user and are scoped to `req.userId`; the WebSocket broadcaster resolves the connecting user from the same session cookie (parsed by hand, since the WS upgrade request sits outside the Express middleware chain) so price-alert notifications - unlike ticks, which stay public - are only delivered to the alert's actual owner. Email verification and password reset both landed later (below).
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

- [ ] **Node 20 → 22.** Node 20 reached end-of-life on 2026-04-30, so the runtime this is pinned to (`.nvmrc` ×3, both `engines`, Render, CI) no longer gets security fixes. It's a real change rather than a bump: `jsdom` and `@types/node` are held back *because* of Node 20, so both move with it, and the backend's `engines` currently refuses 22 outright. Nothing has been run on 22 yet.
- [ ] **`typescript` 6 → 7.** Held, not skipped: typescript-eslint's current release (8.70) still declares `typescript ">=4.8.4 <6.1.0"` and hard-throws `does not support TS 7.0` at config load, so taking 7 today means shipping with no linting — and lint is a CI gate. Revisit when typescript-eslint ships TS 7 support.

## 📄 Licence

MIT — see [LICENSE](LICENSE).

## 🧰 Tech stack

- **Frontend**: React 19, TypeScript 6, Vite 8 (Rolldown), CSS Modules
- **Backend**: Node.js 20 (end-of-life since 2026-04 — see [Roadmap](#️-roadmap)), Express 5, TypeScript 6, `ws`
- **Database**: Postgres via Prisma 7 (`@prisma/adapter-pg`)
- **Validation**: Zod
- **External API**: Massive (REST + WebSocket), formerly Polygon.io
- **Email**: Resend, over its HTTP API directly (one `fetch`, no SDK) — verification, reset and account-exists mail
- **Testing**: Vitest in both packages; Testing Library + jsdom on the frontend, `supertest` and real sockets against a throwaway Postgres on the backend
- **Hosting**: Render — web service, static site, and managed Postgres, all declared in `render.yaml`
- **Automation**: GitHub Actions (CI on every push and PR, a daily smoke run against the deployment) and Dependabot (weekly grouped minor/patch bumps, majors excluded)

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=soft&color=0:16A34A,50:0F172A,100:020617&height=100&section=footer" width="100%" alt="footer" />
</div>
