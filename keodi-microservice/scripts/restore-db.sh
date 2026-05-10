#!/bin/bash
set -euo pipefail

BACKUP_FILE=${1:-}
DB_NAME=${2:-}

if [ -z "$BACKUP_FILE" ] || [ -z "$DB_NAME" ]; then
    echo "Usage: ./restore-db.sh <backup-file> <database-name>"
    echo "  ./restore-db.sh /opt/keodi/backups/auth_db_20260428_030000.sql.gz auth_db"
    echo "  ./restore-db.sh /opt/keodi/backups/core_db_20260428_030000.sql.gz core_db"
    ls -lh /opt/keodi/backups/*.sql.gz 2>/dev/null || echo "No backups found."
    exit 1
fi

[ ! -f "$BACKUP_FILE" ] && echo "Backup file not found: $BACKUP_FILE" && exit 1

if [ "$DB_NAME" == "auth_db" ]; then
    CONTAINER="auth-postgres"
elif [ "$DB_NAME" == "core_db" ]; then
    CONTAINER="core-postgres"
else
    echo "Unknown database: $DB_NAME (expected: auth_db or core_db)"
    exit 1
fi
DB_USER="keodi"

read -p "WARNING: This will REPLACE all data in $DB_NAME. Continue? (y/N): " confirm
[ "$confirm" != "y" ] && echo "Cancelled." && exit 0

docker exec "$CONTAINER" psql -U "$DB_USER" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" postgres 2>/dev/null || true
docker exec "$CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" postgres
docker exec "$CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" postgres

gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" "$DB_NAME"
echo "Restored $DB_NAME successfully"
