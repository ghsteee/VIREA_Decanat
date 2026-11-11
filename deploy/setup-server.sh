#!/usr/bin/env bash
# Первая настройка VPS для «Деканыча» (Ubuntu 22.04/24.04).
# Запуск:  sudo bash setup-server.sh <домен>
# Скрипт можно запускать повторно: сделанные шаги пропускаются.
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR=/opt/dekanych
REPO=git@github.com:ghsteee/VIREA_Decanat.git
KEY=/root/.ssh/dekanych_deploy

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then echo "Запусти через sudo: sudo bash $0 <домен>"; exit 1; fi
if [[ -z "$DOMAIN" ]]; then echo "Укажи домен: sudo bash $0 dekanych.ru"; exit 1; fi

say "1/7 Пакеты Ubuntu и Docker"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl git ufw openssl
# Docker из репозитория Ubuntu — он доступен из России через зеркала Ubuntu
if ! command -v docker >/dev/null; then
  apt-get install -y -q docker.io docker-compose-v2
fi
systemctl enable --now docker
docker compose version

say "2/7 Файрвол: открыты только SSH, HTTP и HTTPS"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable
ufw status

say "3/7 Подкачка (если памяти меньше 3 ГБ)"
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [[ $MEM_MB -lt 3000 && ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "Подкачка 2 ГБ включена"
else
  echo "Не нужна или уже есть (памяти: ${MEM_MB} МБ)"
fi

say "4/7 Проверка Docker Hub"
if docker pull -q hello-world >/dev/null 2>&1; then
  echo "Docker Hub доступен"
else
  echo "Docker Hub недоступен. Узнай у хостинга адрес зеркала реестра, пропиши его в"
  echo "/etc/docker/daemon.json как {\"registry-mirrors\": [\"https://<зеркало>\"]},"
  echo "выполни systemctl restart docker и запусти скрипт снова."
  exit 1
fi

say "5/7 Ключ для чтения приватного репозитория"
if [[ ! -f $KEY ]]; then
  mkdir -p /root/.ssh && chmod 700 /root/.ssh
  ssh-keygen -t ed25519 -N "" -C "dekanych-server" -f "$KEY" >/dev/null
fi
cat > /root/.ssh/config <<CFG
Host github.com
  IdentityFile $KEY
  IdentitiesOnly yes
CFG
ssh-keyscan -q github.com >> /root/.ssh/known_hosts 2>/dev/null || true
if [[ ! -d $APP_DIR/.git ]]; then
  if ! git clone -q "$REPO" "$APP_DIR" 2>/dev/null; then
    echo
    echo "Добавь этот ключ в GitHub: репозиторий → Settings → Deploy keys → Add deploy key"
    echo "(название: dekanych-server, галочку «Allow write access» НЕ ставить):"
    echo
    cat "$KEY.pub"
    echo
    echo "Потом запусти скрипт снова: sudo bash $0 $DOMAIN"
    exit 0
  fi
else
  git -C "$APP_DIR" pull -q
fi
echo "Код в $APP_DIR"

say "6/7 Файл .env с секретами"
cd "$APP_DIR"
if [[ ! -f .env ]]; then
  SEED_PW=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)
  cp .env.example .env
  sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" .env
  sed -i "s|^SEED_PASSWORD=.*|SEED_PASSWORD=$SEED_PW|" .env
  sed -i "s|^GIGACHAT_CA_BUNDLE=.*|GIGACHAT_CA_BUNDLE=/certs/russian_trusted_root_ca.pem|" .env
  chmod 600 .env
  echo "Создан .env (права 600). Пароль тестовых аккаунтов: $SEED_PW"
  echo "Сохрани его в менеджер паролей — он нужен для комментария к работе. В репозиторий и чат его не отправляй."
else
  echo ".env уже есть — не трогаю"
fi

say "7/7 Сборка, база и демо-данные (сборка займёт 5–10 минут)"
docker compose up -d --build
docker compose run --rm tools npx prisma migrate deploy
docker compose run --rm tools npm run db:seed | grep -v "Пароль" || true
docker compose ps

say "Готово"
echo "Открой https://$DOMAIN/login с телефона без VPN."
echo "Если HTTPS не открывается — проверь, что A-запись домена указывает на этот сервер: $(curl -s -4 ifconfig.me || echo '<IP>')"
