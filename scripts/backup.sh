#!/bin/bash
# pg_dump plaintext is piped in memory directly into authenticated encryption.
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
output="backups/pricit-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump.enc"
temporary="${output}.partial"
trap 'rm -f "$temporary"' EXIT
# Suppress PostgreSQL stderr because it can contain connection details; no SQL is logged.
docker compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' 2>/dev/null |
  docker compose run --rm --no-deps -T backend python scripts/encrypt_backup.py > "$temporary"
mv "$temporary" "$output"
printf 'Encrypted backup saved: %s\n' "$output"
