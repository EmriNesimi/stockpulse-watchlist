#!/usr/bin/env bash
#
# Checks that the deployed app actually works.
#
#   ./scripts/smoke.sh
#   API_URL=... APP_URL=... ./scripts/smoke.sh
#
# Every deploy for the past fortnight has been verified by running these same
# requests by hand. A deploy can go green — build passes, service reports
# healthy — while the app is unusable: CORS pointed at the wrong origin, the
# frontend bundle built against a stale API URL, the socket refusing upgrades.
# None of that shows up in CI, because CI never touches the deployed thing.
#
# Read-only. It creates nothing and signs in as nobody.

set -uo pipefail

readonly API="${API_URL:-https://stockpulse-api-n3yu.onrender.com}"
readonly APP="${APP_URL:-https://stockpulse-b449.onrender.com}"
# The free instance sleeps, so the first request has to wait for a cold start.
readonly TIMEOUT="${SMOKE_TIMEOUT:-90}"

pass=0
fail=0

check() {
  local what="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '  ok    %-46s %s\n' "$what" "$actual"
    pass=$((pass + 1))
  else
    printf '  FAIL  %-46s got %s, wanted %s\n' "$what" "$actual" "$expected"
    fail=$((fail + 1))
  fi
}

status() { curl -s -o /dev/null -m "$TIMEOUT" -w '%{http_code}' "$@"; }

echo "backend  $API"
echo "frontend $APP"
echo

echo "api"
check "health responds"            "200" "$(status "$API/health")"
check "health reports the database" "ok"  "$(curl -s -m "$TIMEOUT" "$API/health" | grep -o '"database":"[a-z]*"' | cut -d'"' -f4)"
check "protected route rejects anon" "401" "$(status "$API/api/watchlist")"
check "ticker search works"         "200" "$(status "$API/api/search?q=AAPL")"

echo
echo "cors"
# The most valuable check here: FRONTEND_ORIGIN and the app's real hostname
# are set in two different places and have drifted before. When they don't
# match, every request from the browser fails and nothing else notices.
allowed="$(curl -s -I -m "$TIMEOUT" -X OPTIONS "$API/api/auth/login" \
  -H "Origin: $APP" -H "Access-Control-Request-Method: POST" \
  | grep -i '^access-control-allow-origin:' | tr -d '\r' | awk '{print $2}')"
check "allows the deployed frontend" "$APP" "$allowed"

foreign="$(curl -s -I -m "$TIMEOUT" -X OPTIONS "$API/api/auth/login" \
  -H "Origin: https://evil.example.com" -H "Access-Control-Request-Method: POST" \
  | grep -i '^access-control-allow-origin:' | tr -d '\r' | awk '{print $2}')"
if [[ "$foreign" == "https://evil.example.com" ]]; then
  printf '  FAIL  %-46s reflected a foreign origin\n' "refuses a foreign origin"; fail=$((fail + 1))
else
  printf '  ok    %-46s not reflected\n' "refuses a foreign origin"; pass=$((pass + 1))
fi

echo
echo "frontend"
check "app loads"     "200" "$(status "$APP")"
check "favicon served" "200" "$(status "$APP/favicon.svg")"
check "spa fallback"   "200" "$(status "$APP/verify-email?token=probe")"

# Vite inlines VITE_API_URL at build time, so a stale value survives a restart
# and only a rebuild fixes it. This is the check that catches that.
bundle="$(curl -s -m "$TIMEOUT" "$APP" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)"
if [[ -n "$bundle" ]] && curl -s -m "$TIMEOUT" "$APP$bundle" | grep -q "$API"; then
  printf '  ok    %-46s %s\n' "bundle points at this api" "$bundle"; pass=$((pass + 1))
else
  printf '  FAIL  %-46s not found in %s\n' "bundle points at this api" "${bundle:-<no bundle>}"; fail=$((fail + 1))
fi

echo
echo "websocket"
# Live prices are the whole point of the app, and the upgrade path has its own
# origin check, session handling and per-IP caps — none of which the HTTP
# checks above touch. A deploy where the socket refuses upgrades looks
# perfectly healthy from every other angle here.
# WebSocket is global from Node 22 and behind a flag on 20. Detect rather than
# hardcode either, so this keeps working in both directions.
ws_flag=""
node -e 'process.exit(typeof WebSocket === "function" ? 0 : 1)' 2>/dev/null || ws_flag="--experimental-websocket"

ws_result="$(WS_URL="${API/https:/wss:}/ws" WS_ORIGIN="$APP" node $ws_flag -e '
const url = process.env.WS_URL;
const WebSocket = globalThis.WebSocket;
if (!WebSocket) { console.log("skipped: no WebSocket in this node"); process.exit(0); }
const ws = new WebSocket(url, { headers: { Origin: process.env.WS_ORIGIN } });
const done = (m) => { console.log(m); process.exit(0); };
const timer = setTimeout(() => done("failed: no tick within 25s"), 25000);
ws.addEventListener("open", () => ws.send(JSON.stringify({ action: "subscribe", symbols: ["AAPL"] })));
ws.addEventListener("message", (e) => {
  clearTimeout(timer);
  try {
    const msg = JSON.parse(e.data);
    done(msg.type === "tick" && typeof msg.price === "number" ? "ok" : "failed: unexpected first message " + msg.type);
  } catch { done("failed: unparseable frame"); }
});
ws.addEventListener("error", () => { clearTimeout(timer); done("failed: connection error"); });
' 2>/dev/null)"

case "$ws_result" in
  ok)        printf '  ok    %-46s subscribed and received a tick\n' "upgrade, subscribe, tick"; pass=$((pass + 1)) ;;
  skipped:*) printf '  skip  %-46s %s\n' "upgrade, subscribe, tick" "$ws_result" ;;
  *)         printf '  FAIL  %-46s %s\n' "upgrade, subscribe, tick" "${ws_result:-no result}"; fail=$((fail + 1)) ;;
esac

echo
echo "headers"
headers="$(curl -s -I -m "$TIMEOUT" "$APP" | tr -d '\r')"
for h in x-frame-options content-security-policy x-content-type-options; do
  if grep -qi "^$h:" <<<"$headers"; then
    printf '  ok    %-46s present\n' "$h"; pass=$((pass + 1))
  else
    printf '  FAIL  %-46s missing\n' "$h"; fail=$((fail + 1))
  fi
done

echo
printf '%d passed, %d failed\n' "$pass" "$fail"
[[ "$fail" -eq 0 ]]
