#!/usr/bin/env bash
# Запуск из корня репозитория на VPS: bash deploy/backup-db.sh
set -euo pipefail
umask 077
cd "$(git rev-parse --show-toplevel)"
backup_dir="${BACKUP_DIR:-/var/backups/dekanych}"
mkdir -p "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd -P)"
partial="$(mktemp "$backup_dir/.dump-XXXXXXXX")"
trap 'rm -f -- "$partial"' EXIT
docker compose exec -T db pg_dump -U dekanych -d dekanych --format=custom --no-owner --no-acl > "$partial"
# Проверяем, что архив читается, прежде чем считать копию готовой.
docker compose exec -T db pg_restore --list < "$partial" > /dev/null
destination="$backup_dir/dekanych-$(date -u +%Y%m%dT%H%M%SZ)-${partial##*-}.dump"
mv -- "$partial" "$destination"
echo "Резервная копия: $destination"
echo "Проверка восстановления: bash deploy/check-backup.sh '$destination'"
