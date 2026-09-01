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
- **REST responses aren't runtime-validated** the way WebSocket messages are.
  Same trusted backend and stable shapes, so the risk is low — but it's an
  asymmetry, and it's named in `docs/REVIEW-FINDINGS.md` rather than left for
  someone to find.

## What has been reviewed

Three independent audits, with findings and fixes recorded in
[`docs/REVIEW-FINDINGS.md`](docs/REVIEW-FINDINGS.md) and the README:

- **Security** — auth, session handling, IDOR, injection, rate limiting, and
  third-party API cost abuse.
- **Accessibility** — WCAG 2.2 AA.
- **React and TypeScript correctness.**

Each one found real problems, and each one's misses are recorded too.
