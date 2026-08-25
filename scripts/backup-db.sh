#!/usr/bin/env bash
#
# Dumps the StockPulse Postgres to a compressed, timestamped file.
#
#   DATABASE_URL='postgresql://...' ./scripts/backup-db.sh
#
# Written because the Render free database is deleted on its expiry date rather
# than suspended — losing it loses every account, watchlist and holding.
#
# pg_dump runs inside the postgres:18 image rather than against a local install.
# Two reasons: there is no pg_dump on the dev machine, and pg_dump refuses to
# dump a server newer than itself, so pinning the image to the server's major
# is what stops this quietly breaking the next time Postgres is upgraded.
#
# Read-only. It never writes to the database.

set -euo pipefail

readonly PG_IMAGE="postgres:18"
readonly OUT_DIR="${BACKUP_DIR:-backups}"

die() { printf 'error: %s\n' "$1" >&2; exit 1; }

[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL is not set.
  Use the *external* connection string from the Render dashboard — the internal
  hostname only resolves from inside Render's network.
  Pass it inline so it doesn't linger in your shell history:
    DATABASE_URL='postgresql://...' ./scripts/backup-db.sh"

command -v docker >/dev/null || die "docker is required (it provides pg_dump ${PG_IMAGE})"
docker info >/dev/null 2>&1 || die "the docker daemon isn't running"

mkdir -p "$OUT_DIR"
readonly STAMP="$(date +%Y%m%d-%H%M%S)"
readonly OUT="${OUT_DIR}/stockpulse-${STAMP}.sql.gz"

printf 'dumping to %s ...\n' "$OUT"

# --no-owner/--no-acl so the dump restores into a database owned by a different
# role, which is exactly the situation you'll be in when restoring to a new
# instance. The URL goes in via the environment, never argv, so it stays out of
# the container's visible process list.
if ! docker run --rm -i \
  -e PGCONNECT_TIMEOUT=15 \
  -e DATABASE_URL \
  "$PG_IMAGE" \
  pg_dump --no-owner --no-acl --format=plain "$DATABASE_URL" 2>/tmp/pgdump.err | gzip > "$OUT"; then
  rm -f "$OUT"
  die "pg_dump failed: $(tr '\n' ' ' </tmp/pgdump.err)"
fi

# Exiting 0 is not proof of a usable backup — an empty or truncated dump exits
# 0 just as happily. Check the thing actually contains the schema.
readonly EXPECTED_TABLES=(User Watchlist WatchlistItem PriceAlert)
missing=()
for table in "${EXPECTED_TABLES[@]}"; do
  gzip -dc "$OUT" | grep -q "CREATE TABLE public.\"${table}\"" || missing+=("$table")
done

if (( ${#missing[@]} )); then
  die "dump is missing expected tables: ${missing[*]} — kept at $OUT for inspection"
fi

readonly BYTES="$(wc -c <"$OUT" | tr -d ' ')"
readonly ROWS="$(gzip -dc "$OUT" | grep -c '^COPY public\.' || true)"

printf '\nbackup ok\n'
printf '  file    %s (%s bytes)\n' "$OUT" "$BYTES"
printf '  tables  %s\n' "${EXPECTED_TABLES[*]}"
printf '  data    %s COPY block(s)\n' "$ROWS"
printf '\nrestore into a NEW, EMPTY database with:\n'
printf '  gzip -dc %s | docker run --rm -i -e DATABASE_URL %s psql "$DATABASE_URL"\n' "$OUT" "$PG_IMAGE"
printf '\nnever restore over a database you still need — this does not drop first,\nso restoring onto existing rows will collide on the primary keys.\n'
