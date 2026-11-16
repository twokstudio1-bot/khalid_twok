#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/twok_${STAMP}.sql"
if [ -d "public/uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads_${STAMP}.tar.gz" public/uploads
fi
find "$BACKUP_DIR" -type f -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete
echo "Backup created in $BACKUP_DIR"