<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:020617,100:16A34A&height=200&section=header&text=StockPulse&fontSize=60&fontColor=F8FAFC&fontAlignY=38&desc=Real-time%20stock%20watchlist%20%E2%80%94%20search%2C%20track%2C%20watch%20it%20move&descAlignY=58&descSize=18" width="100%" alt="StockPulse banner" />

<img src="https://readme-typing-svg.demolab.com?font=Inter&size=20&duration=2800&pause=900&color=26A69A&center=true&vCenter=true&width=560&lines=Search+a+ticker...;Add+it+to+your+watchlist...;Watch+the+price+move+live." alt="Typing animation" />

<br />

![React](https://img.shields.io/badge/React-18-0F172A?style=for-the-badge&logo=react&logoColor=26A69A)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-0F172A?style=for-the-badge&logo=typescript&logoColor=26A69A)
![Express](https://img.shields.io/badge/Express-4-0F172A?style=for-the-badge&logo=express&logoColor=F8FAFC)
![WebSocket](https://img.shields.io/badge/WebSocket-ws-0F172A?style=for-the-badge&logo=socketdotio&logoColor=26A69A)
![Prisma](https://img.shields.io/badge/Prisma-SQLite-0F172A?style=for-the-badge&logo=prisma&logoColor=F8FAFC)
![Polygon.io](https://img.shields.io/badge/Polygon.io-market%20data-0F172A?style=for-the-badge&logo=polygon&logoColor=26A69A)

</div>

---

A real-time stock watchlist: search for tickers, add them to your list, and watch prices update live over a WebSocket. Full-stack — React frontend, Express + WebSocket backend, SQLite persistence via Prisma, Polygon.io for market data.

Built as a portfolio project to demonstrate working with an external API, real-time data over WebSockets, and a properly separated frontend/backend with real persistence — not just a static demo.

## 📍 Status

Feature-complete for the initial build. Built incrementally, commit by commit — full history on the repo shows each piece landing and getting manually tested before the next one started.

**✅ Done**
- **Backend**: Express API, Prisma/SQLite watchlist persistence, Polygon ticker search proxy (with a static fallback list), a simulated real-time price engine, real Polygon WebSocket integration (with automatic graceful fallback if the key isn't entitled), and a WebSocket broadcaster that fans price ticks out to connected clients with per-connection rate/size/subscription limits.
- **Frontend**: Vite + React + TS app in the dark trading-terminal design system — debounced ticker search wired to the real API, a watchlist table with sparklines and a working remove button, a live WebSocket client with reconnect/backoff, per-row LIVE/SIM badges, and a header connection-status indicator.
- **Accessibility**: throttled `aria-live` price announcements, a skip link, Escape-to-dismiss on search, visible focus states, `prefers-reduced-motion` support, and color-paired (never color-only) up/down indicators.
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
                                              │  Polygon.io REST  │               │  Prisma → SQLite        │
                                              │  (ticker search,  │               │  (Watchlist,             │
                                              │   previous close) │               │   WatchlistItem)         │
                                              └───────────────────┘               └─────────────────────────┘
```

<details>
<summary><strong>PriceFeed abstraction (click to expand)</strong></summary>

```
PriceFeed (backend/src/priceFeed/):
┌─────────────────────────────────────────────┐
│  POLYGON_API_KEY set?                        │
│    yes → PolygonLiveFeed                     │
│            (wss://socket.polygon.io/stocks)  │
│            auth fails/not entitled?          │
│              → falls back to SimulatedFeed   │
│    no  → SimulatedFeed directly              │
│           (random walk seeded from Polygon's │
│            previous-close REST endpoint)     │
└─────────────────────────────────────────────┘
```

**Why does this exist?** Polygon's free tier doesn't include real-time US stock trades over WebSocket — that needs a paid plan. Rather than the app being broken without one, `PriceFeed` is an interface with two implementations: `SimulatedFeed` (a random walk seeded from a real previous-close price) and `PolygonLiveFeed` (the real thing). `PolygonLiveFeed` detects auth failure or missing entitlement and transparently swaps its subscribers over to `SimulatedFeed` — no reconnect, no frontend changes, no crash. Drop in a paid key later and it just works.

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
│   │   ├── routes/
│   │   │   ├── watchlist.ts       # GET/POST/DELETE, zod-validated
│   │   │   └── search.ts          # Polygon ticker search proxy + fallback list
│   │   ├── polygon/
│   │   │   └── fallbackTickers.ts # static list used when there's no API key
│   │   ├── priceFeed/
│   │   │   ├── PriceFeed.ts       # the interface
│   │   │   ├── SimulatedFeed.ts   # default — random walk, no key needed
│   │   │   ├── PolygonLiveFeed.ts # real wss://socket.polygon.io/stocks feed
│   │   │   ├── previousClose.ts   # shared REST helper for seeding base prices
│   │   │   └── index.ts           # createPriceFeed() factory
│   │   └── ws/
│   │       └── broadcaster.ts     # WS server: subscribe/unsubscribe, rate + size limits
│   ├── prisma/
│   │   ├── schema.prisma          # Watchlist, WatchlistItem models
│   │   └── migrations/
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── types.ts                     # shared PriceState type
│   │   ├── index.css                    # global styles, tabular-nums, sr-only, reduced-motion
│   │   ├── styles/tokens.css            # design system CSS variables
│   │   ├── components/
│   │   │   ├── Search.tsx               # debounced ticker search
│   │   │   ├── WatchlistTable.tsx       # symbol/price/change/sparkline/remove
│   │   │   ├── PriceCell.tsx            # price + LIVE/SIM badge + tick flash
│   │   │   ├── Sparkline.tsx            # inline SVG price history
│   │   │   └── ConnectionBadge.tsx      # WS connection status indicator
│   │   ├── hooks/
│   │   │   ├── useDebouncedValue.ts
│   │   │   ├── useLiveTicks.ts          # WS client: subscribe diffing, reconnect/backoff
│   │   │   └── useThrottledAnnouncement.ts  # aria-live summary, throttled to 1/8s
│   │   └── lib/
│   │       ├── api.ts                   # fetch wrappers for the backend REST API
│   │       └── ws.ts                    # WS URL resolution
│   └── vite.config.ts
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
cp .env.example .env       # optional edits — see below, works with zero edits
npx prisma migrate dev
npm run dev                 # http://localhost:4000

# frontend, in a second terminal
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Then open `http://localhost:5173` — search a ticker, add it, and it should start ticking within a couple seconds on the simulated feed.

The backend works with **zero environment variables set** — it boots on the simulated price feed and a static ticker-search fallback list automatically. You don't need a Polygon.io account to run or demo this.

### 🔑 Getting a Polygon.io API key (optional)

1. Sign up for free at [polygon.io/dashboard/signup](https://polygon.io/dashboard/signup).
2. Copy your API key into `backend/.env` as `POLYGON_API_KEY=...`.
3. Restart the backend.

With a free key, ticker search will hit Polygon's real REST API instead of the static fallback list. Real-time WebSocket stock trades require a **paid** Polygon plan — with a free key, `PolygonLiveFeed` will attempt the connection, get an entitlement error back from Polygon, and automatically fall back to the simulated feed. This is expected and handled gracefully; you'll see a log line explaining it.

### 🔌 Trying the WebSocket directly

Once the backend's running, you can watch live ticks with any WS client, e.g.:

```bash
npx wscat -c ws://localhost:4000/ws
# then send:
{"action":"subscribe","symbols":["AAPL","MSFT"]}
```

You'll get back `{"type":"tick","symbol":"AAPL","price":...,"changePercent":...,"source":"simulated"}` messages roughly every 1.5s per symbol.

## ⚙️ Environment variables (`backend/.env`)

| Var | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `4000` | |
| `POLYGON_API_KEY` | no | — | app runs on the simulated feed without it |
| `DATABASE_URL` | no | `file:./prisma/dev.db` | SQLite connection string |
| `FRONTEND_ORIGIN` | no | `http://localhost:5173` | locks down CORS to this origin |

`backend/.env` is gitignored — only `.env.example` (with blank/placeholder values) is committed. The API key never reaches the frontend; all Polygon calls happen server-side.

## 🔒 Security notes

- **Secrets**: `POLYGON_API_KEY` lives only in `backend/.env` (gitignored). Never sent to the client. CI includes a grep-based backstop check for anything that looks like a committed key.
- **Input validation**: every REST endpoint validates its input with `zod` before touching Prisma or building a Polygon URL. WebSocket subscribe/unsubscribe messages are validated the same way.
- **Rate limiting**: `express-rate-limit` on all `/api` routes (60 req/min); the WS broadcaster caps each connection at 30 subscribed symbols, 60 messages/min, and a 2KB max message size, so one misbehaving client can't exhaust server resources.
- **Headers/CORS**: `helmet` for standard security headers; CORS locked to `FRONTEND_ORIGIN`, no wildcard.
- **Dependencies**: lockfiles committed for both workspaces. `npm audit` is clean on runtime dependencies. The frontend has one known, accepted exception — see below.
- **CI**: `.github/workflows/ci.yml` runs typecheck + build + `npm audit` + a secret-pattern grep on every push/PR for both workspaces.

<details>
<summary><strong>Known accepted risk: Vite/esbuild dev-server advisories (click to expand)</strong></summary>

<br />

`npm audit` on the frontend flags a handful of advisories against `vite`/`esbuild` (path traversal and `fs.deny` bypass in Vite's *local dev server*, plus an esbuild dev-server CORS issue). These are:

- Dev-server-only — they don't affect the production build output that actually ships.
- devDependencies, excluded from CI's audit step via `npm audit --omit=dev`.
- Not cleanly fixable right now: the only fix Vite offers is a major-version jump to Vite 8, which uses a new Rolldown-based bundler that currently fails to build on this project's Node version (missing a native binding, `rolldown-binding.darwin-universal.node` not found). Tracked for revisiting once Vite 8 stabilizes.

</details>

## 🧰 Tech stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Node.js, Express 4, TypeScript, `ws`
- **Database**: SQLite via Prisma
- **Validation**: Zod
- **External API**: Polygon.io (REST + WebSocket)

---

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:16A34A,100:020617&height=100&section=footer" width="100%" alt="footer" />
</div>
