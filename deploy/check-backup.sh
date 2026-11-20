#!/usr/bin/env bash
# Восстанавливает архив в отдельную временную БД, рабочую базу не изменяет.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
archive="${1:-}"
if [[ -z "$archive" || ! -f "$archive" ]]; then
  echo "Укажи путь к файлу резервной копии." >&2
  exit 1
fi
temporary_db="dekanych_restore_$(date -u +%Y%m%d%H%M%S)_${RANDOM}"
[[ "$temporary_db" =~ ^dekanych_restore_[0-9]+_[0-9]+$ ]] || exit 1
docker compose exec -T db createdb -U dekanych "$temporary_db"
cleanup() { docker compose exec -T db dropdb -U dekanych "$temporary_db"; }
trap cleanup EXIT
docker compose exec -T db pg_restore -U dekanych -d "$temporary_db" --exit-on-error --no-owner --no-acl < "$archive"
count="$(docker compose exec -T db psql -U dekanych -d "$temporary_db" -At -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM "User"')"
[[ "$count" =~ ^[0-9]+$ && "$count" -ge 4 ]] || {
  echo "В восстановленной копии нет ожидаемых демо-аккаунтов." >&2
  exit 1
}
echo "Восстановление проверено. Аккаунтов: $count. Временная база будет удалена."
