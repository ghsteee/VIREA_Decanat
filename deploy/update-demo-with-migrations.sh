#!/usr/bin/env bash
# Обновление существующего VPS для релиза с учёбой, сессией и портфолио.
set -Eeuo pipefail
umask 077

fail() { printf '%s\n' "$*" >&2; exit 1; }

target="${1:-}"
[[ "$target" =~ ^[0-9a-f]{40}$ ]] || fail 'Укажи полный SHA проверенного коммита main.'

app_dir="$(git rev-parse --show-toplevel)"
cd "$app_dir"
[[ "$(git branch --show-current)" == main && -z "$(git status --porcelain)" ]] ||
  fail 'На сервере нужна чистая ветка main. Проверь git status.'

exec 9>/var/lock/dekanych-deploy.lock
flock -n 9 || fail 'Другое обновление уже выполняется.'

git fetch origin main
[[ "$target" == "$(git rev-parse FETCH_HEAD)" ]] || fail 'SHA больше не совпадает с вершиной main. Проверь актуальный коммит.'
base="$(git rev-parse HEAD)"
git merge-base --is-ancestor "$base" "$target" || fail 'Серверная ветка разошлась с main. Автоматическое обновление остановлено.'

# Возврат старого образа возможен с этими добавочными миграциями.
while IFS=$'\t' read -r status migration; do
  [[ -n "$status" ]] || continue
  case "$status:$migration" in
    A:prisma/migrations/20261121200000_study_activity/migration.sql|\
    A:prisma/migrations/20261121210000_session_editor/migration.sql|\
    A:prisma/migrations/20261121220000_portfolio/migration.sql) ;;
    *) fail "В релизе есть другая операция с миграцией ($migration). Нужен план для неё." ;;
  esac
done <<< "$(git diff --no-renames --name-status "$base" "$target" -- prisma/migrations)"

app_container="$(docker compose ps -q app)"
[[ -n "$app_container" && "$(docker inspect --format '{{.State.Running}}' "$app_container")" == true ]] ||
  fail 'Запусти текущий контейнер app перед обновлением, чтобы его можно было вернуть.'
old_image="$(docker inspect --format '{{.Image}}' "$app_container")"
image_tag="$(docker inspect --format '{{.Config.Image}}' "$app_container")"
portfolio_mount="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/storage/portfolio"}}{{.Destination}}{{end}}{{end}}' "$app_container")"
[[ "$old_image" =~ ^sha256:[0-9a-f]{64}$ && -n "$image_tag" ]] || fail 'Не удалось определить предыдущий образ приложения.'

verify_login() {
  local attempt status
  for attempt in {1..15}; do
    status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 5 \
      --resolve 'dekanych.ru:443:127.0.0.1' 'https://dekanych.ru/login')" || status='000'
    [[ "$status" == 200 ]] && return 0
    sleep 2
  done
  return 1
}

printf '%s\n' 'Сохраняю образ для возврата и собираю новый релиз.'
docker image tag "$old_image" "dekanych-rollback:${old_image#sha256:}"
git merge --ff-only "$target"
docker compose --profile tools build app tools

mkdir -p /var/backups/dekanych
backup_dir="$(mktemp -d "/var/backups/dekanych/${target:0:12}-$(date +%Y%m%d-%H%M%S).XXXXXX")"
git show "$base:docker-compose.yml" > "$backup_dir/compose-before.yml"
printf '%s\n' "$base" > "$backup_dir/revision-before"
printf '%s\n' "$old_image" > "$backup_dir/image-before"

rollback() {
  local status=$?
  trap - EXIT
  if [[ "$status" == 0 ]]; then
    return
  fi
  printf 'Обновление прервано. Возвращаю предыдущий образ. Каталог копии %s\n' "$backup_dir" >&2
  if docker image tag "$old_image" "$image_tag" &&
    docker compose --project-directory "$app_dir" -f "$backup_dir/compose-before.yml" \
      up -d --no-deps --no-build --force-recreate app && verify_login; then
    printf '%s\n' 'Предыдущий образ снова отвечает на /login. Схема БД оставлена в текущем состоянии.' >&2
  else
    printf '%s\n' 'Предыдущий образ не прошёл проверку. Проверь docker compose ps и docker compose logs app.' >&2
  fi
  exit "$status"
}

trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

printf 'Сохраняю БД и вложения в %s\n' "$backup_dir"
docker compose stop app
docker compose exec -T db pg_dump --username=dekanych --dbname=dekanych --format=custom > "$backup_dir/db.dump"
docker compose exec -T db pg_restore --list < "$backup_dir/db.dump" > "$backup_dir/db-contents.txt"
if [[ -n "$portfolio_mount" ]]; then
  docker run --rm --network none --user 0:0 --volumes-from "$app_container:ro" \
    --entrypoint tar "$old_image" -C "$portfolio_mount" -czf - . > "$backup_dir/portfolio.tar.gz"
  tar -tzf "$backup_dir/portfolio.tar.gz" > /dev/null
fi

printf '%s\n' 'Применяю миграции и запускаю новый образ.'
docker compose run --rm --no-deps tools npx --no-install prisma migrate deploy
docker compose up -d --no-deps --no-build app
verify_login || fail 'Новый контейнер не ответил HTTP 200 на /login.'
docker compose exec -T app sh -ec 'test -w "${PORTFOLIO_STORAGE_DIR:-/app/storage/portfolio}" && test -r /app/public/fonts/onest-regular.ttf' ||
  fail 'Контейнер не может сохранять вложения или читать шрифт PDF.'

trap - EXIT INT TERM HUP
printf 'Обновлено до %s. Копия сохранена в %s\n' "$target" "$backup_dir"
docker compose ps
