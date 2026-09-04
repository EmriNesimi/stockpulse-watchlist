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
