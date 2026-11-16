#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${1:?Usage: restore.sh <sql-file>}"
psql "$DATABASE_URL" < "$1"
echo "Restore complete"