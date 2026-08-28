# Review findings — 2026-08-17

Progress snapshot from the post-redesign quality pass. Four ECC reviewers were
launched; only the security review finished before the run was stopped to save
tokens. The other three were killed mid-flight and produced no output.

| Reviewer | Status |
|---|---|
| `ecc:security-reviewer` | ✅ Completed — findings below |
| `ecc:react-reviewer` | ⛔ Stopped before reporting |
| `ecc:typescript-reviewer` | ⛔ Stopped before reporting |
| `ecc:a11y-architect` | ⛔ Stopped before reporting |

---

## Security review — completed

### Verdict on the four fixes applied earlier

All four held up under adversarial re-examination. Specifically confirmed sound:

- **`trust proxy: 1`** — correct choice over `true`, which would let a client
  spoof `X-Forwarded-For` and dodge the limiter. Caveat: if a CDN is ever added
  in front of the existing proxy (two hops), this must become `2` or the
  limiter starts keying off the CDN's IP.
- **CORS incl. PATCH** — single-origin allow-list, `credentials: true`, foreign
  origins not echoed back.
- **WebSocket origin check** — no bypass found. Exact `===` match rejects
  lookalike origins (`localhost:5173.evil.com`), scheme confusion
  (`https://` vs `http://`), and sandboxed-iframe `Origin: null` (which arrives
  as the literal string `"null"`, not `undefined`, so it does not hit the
  allow-when-absent branch).
- **CSP** — `script-src 'self'` with no `unsafe-inline`/`unsafe-eval` is a real
  XSS-exfiltration control.

### Independently confirmed clean

- **Session cookie** (`auth/session.ts`) — `${userId}.${hmac}` split on
  `lastIndexOf(".")`. Not forgeable: cuid userIds and hex signatures can never
  contain `.`, and the verifier recomputes the HMAC from whatever it split, so
  a shifted split cannot yield a valid signature for another user.
- **Per-user scoping** — no IDOR. Deletes use `deleteMany({ where: { watchlistId, ... } })`
  rather than `delete({ where: { id } })`, so another user's row can never match.
- **Secrets** — none in tracked files or git history. `backend/.env` is
  correctly untracked and gitignored.
- **Verification tokens** — 256 bits of entropy, single-use (both token and
  expiry nulled in the same update), expiry enforced.

### Open items

> **All three below were fixed on 2026-08-22–23 and are kept for the reasoning,
> not as outstanding work.** 1 and 2 are closed in `render.yaml` and
> `ws/broadcaster.ts`; the SPA-fallback note further down is closed by the
> rewrite rule in `render.yaml`. Current open items live in the README's
> Accessibility section, which supersedes this file.

**1. Low — clickjacking header missing (defence in depth)**
A CSP delivered via `<meta http-equiv>` silently ignores `frame-ancestors` per
spec. Our policy doesn't set it, so nothing was lost — but the frontend
therefore has no clickjacking protection. It has to come from an HTTP response
header set by whatever hosts the built static files. The backend's `helmet()`
does not cover this; it only protects the API origin.

**2. Low — WebSocket upgrades are not IP rate-limited**
`MAX_MESSAGES_PER_MINUTE` is per-`ClientState`, so a client resets its own
60/min budget by reconnecting. Nothing rate-limits `/ws` upgrades by IP.

**3. Dismissed — "GET /verify-email is prefetched by email scanners"**
The reviewer flagged that a state-mutating `GET` can have its single-use token
burned by corporate mail scanners (Defender Safe Links, Proofpoint) that
prefetch links. **This does not apply here**: the email links to
`${FRONTEND_ORIGIN}/verify-email?token=...` (`routes/auth.ts:33`), not to the
API. A scanner fetching that URL gets the SPA shell; consuming the token
requires executing the JS in `App.tsx` that calls the API, which scanners do
not do. Recorded so the same finding isn't re-raised.

---

## Found while verifying the above (not from a reviewer)

**The verification email still uses the pre-redesign green.**
`email/resend.ts:43` hardcodes `background: #16a34a` on the CTA button — the old
accent. Should be the violet `#8044fe`.

**`/verify-email` needs an SPA fallback in production.**
There is no router; `App.tsx` reads `?token=` from `window.location.search`
regardless of path. The Vite dev server serves `index.html` for unknown paths,
so this works locally — but a static host must be configured to rewrite
`/verify-email` to `index.html` or the link 404s.

---

## Not yet reviewed

React correctness and TypeScript type safety remain unaudited — nobody has
looked at either, and they're now the last unexamined part of the codebase.

**Accessibility is no longer on this list.** It was audited against WCAG 2.2 AA
on 2026-08-23. Both worries named here turned out to be worth having: the
light theme had not been contrast-checked to the same standard as the dark
theme and three composed-UI combinations failed outright, though the icon-rail
accessible names were in fact correct at every breakpoint. Findings and what's
still open live in the README's Accessibility section.
