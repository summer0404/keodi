#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/keodi/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

docker exec auth-postgres pg_dump -U keodi auth_db | gzip > "$BACKUP_DIR/auth_db_${DATE}.sql.gz"
docker exec core-postgres pg_dump -U keodi core_db | gzip > "$BACKUP_DIR/core_db_${DATE}.sql.gz"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

ls -lh "$BACKUP_DIR"/*_${DATE}.sql.gz
du -sh "$BACKUP_DIR"
