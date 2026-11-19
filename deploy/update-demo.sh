#!/usr/bin/env bash
# Обновление уже развёрнутого демо. Для релизов без изменения схемы БД.
set -euo pipefail

target="${1:-}"
if [[ ! "$target" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Укажи полный SHA проверенного коммита main." >&2
  exit 1
fi
cd "$(git rev-parse --show-toplevel)"
health_url='https://dekanych.ru/login'

verify_login() {
  local attempt
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if [[ "$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 5 "$health_url")" == 200 ]]; then
      return 0
    fi
    sleep 3
  done
  return 1
}

if [[ "$(git branch --show-current)" != main || -n "$(git status --porcelain)" ]]; then
  echo "Остановлено: нужна чистая ветка main на сервере." >&2
  exit 1
fi

base="$(git rev-parse HEAD)"
git fetch origin main
if [[ "$target" != "$(git rev-parse FETCH_HEAD)" ]]; then
  echo "Остановлено: проверенный коммит уже не вершина main. Сначала проверь новый коммит." >&2
  exit 1
fi
git merge-base --is-ancestor "$base" "$target"

if ! git diff --quiet "$base" "$target" -- prisma/schema.prisma prisma/migrations; then
  echo "Остановлено: меняется схема БД. Нужен отдельный порядок обновления с резервной копией." >&2
  exit 1
fi

container="$(docker compose ps -q app)"
if [[ -z "$container" || "$(docker inspect --format '{{.State.Running}}' "$container")" != true ]]; then
  echo "Остановлено: не найден запущенный контейнер app для возврата." >&2
  exit 1
fi
old_image="$(docker inspect --format '{{.Image}}' "$container")"
image_tag="$(docker inspect --format '{{.Config.Image}}' "$container")"

git merge --ff-only "$target"
# Пока образ собирается, работающий контейнер остаётся на месте.
docker compose build app
if docker compose up -d --no-deps --no-build app && verify_login; then
  echo "Обновлено до $(git rev-parse --short HEAD), /login ответил HTTP 200."
  docker compose ps
  exit 0
fi

echo "Проверка входа после обновления не прошла. Возвращаю предыдущий образ." >&2
docker image tag "$old_image" "$image_tag"
if docker compose up -d --no-deps --no-build --force-recreate app && verify_login; then
  echo "Предыдущий образ вернулся, /login HTTP 200. Файлы в папке проекта остались на новом коммите." >&2
else
  echo "Предыдущий образ не прошёл проверку входа. Нужна проверка состояния docker compose ps на сервере." >&2
fi
exit 1
