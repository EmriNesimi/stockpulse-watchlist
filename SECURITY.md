# Security

This is a portfolio project, not a product with users to protect — but it's
deployed, it handles accounts and passwords, and the README makes specific
security claims. So it's worth saying how to report something and what's
already known.

## Reporting

Open a [private security advisory](https://github.com/EmriNesimi/stockpulse-watchlist/security/advisories/new)
rather than a public issue. There's no formal response time — it's one person's
side project — but it will be read.

## What's already known

These are documented rather than hidden, because a security note that only
lists strengths isn't worth reading:

- **The database allows inbound connections from `0.0.0.0/0`.** A deliberate
  choice, not an oversight. The password is long and random and the app
  connects over Render's internal network, so nothing depends on the external
  route being open.
- **Verification email delivery is limited to one address.** The default Resend
  sender only reaches the account owner. Verification gates nothing, so this
  costs a trust badge rather than access.
- **Price alerts have no cap.** A watchlist is limited to 30 items; the
  number of alerts a user can create is unbounded, and an alert's symbol
  doesn't have to be on their watchlist. Every tick for a popular symbol
  does a `findMany` across all alerts for it, so the per-tick cost grows
  with total alerts rather than with anything a single user sees. Known,
  not fixed — it's a missing limit rather than a bug.
- **REST responses are runtime-validated only where their numbers reach
  arithmetic** — watchlist items, candles and alerts. Other responses are
  still trusted on shape. Same trusted backend either way, so the risk is
  low, but the boundary is partial and it's named in
  `docs/REVIEW-FINDINGS.md` rather than left for someone to find.

## What has been reviewed

Five review passes, with findings and fixes recorded in
[`docs/REVIEW-FINDINGS.md`](docs/REVIEW-FINDINGS.md) and the README:

- **Security** (2026-08-17) — auth, session handling, IDOR, injection, rate
  limiting, and third-party API cost abuse.
- **Accessibility** (2026-08-23) — WCAG 2.2 AA.
- **React and TypeScript correctness** (2026-08-31).
- **Backend correctness** (2026-09-03) — three concurrency bugs reachable by
  ordinary traffic.
- **Security, again** (2026-09-06) — the auth surface rewritten since the
  first pass: revocation, password reset, the mail throttle, the scripts and
  workflows. Two findings, both in the new code.
- **React and backend, again** (2026-09-22) — three concurrency findings,
  two of them the same read-then-write shape as September's races, in code
  those passes had already read.

Each one found real problems, and each one's misses are recorded too.
