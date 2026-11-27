#!/usr/bin/env bash
# Runs the access rules against a throwaway local Postgres. Needs initdb and pg_ctl.
set -euo pipefail
cd "$(dirname "$0")/../.."
BIN=${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}
[ -n "$BIN" ] || BIN=$(dirname "$(command -v pg_ctl)")
DIR=$(mktemp -d)
AS=(); if [ "$(id -u)" = 0 ]; then chown postgres "$DIR"; AS=(runuser -u postgres --); fi
"${AS[@]}" "$BIN/initdb" -D "$DIR/data" -U postgres >/dev/null
"${AS[@]}" "$BIN/pg_ctl" -D "$DIR/data" -o "-k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap '"${AS[@]}" "$BIN/pg_ctl" -D "$DIR/data" -w stop >/dev/null; rm -rf "$DIR"' EXIT
psql -q -h "$DIR" -U postgres -v ON_ERROR_STOP=1 \
  -f supabase/tests/shim.sql -f supabase/migrations/0001_init.sql -f supabase/migrations/0002_cohort_life.sql -f supabase/migrations/0003_removal_and_privacy.sql -f supabase/tests/rules.sql
