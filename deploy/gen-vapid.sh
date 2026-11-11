#!/usr/bin/env bash
# Сгенерировать ключи VAPID для web push и записать в .env, если их там нет.
# Запуск из папки проекта: sudo bash deploy/gen-vapid.sh
set -euo pipefail
ENV_FILE="${1:-.env}"
[[ -f "$ENV_FILE" ]] || { echo "Нет файла $ENV_FILE"; exit 1; }
if grep -qE '^VAPID_PRIVATE_KEY=.+' "$ENV_FILE"; then echo "Ключи VAPID уже есть — не трогаю"; exit 0; fi

b64url() { base64 | tr -d '\n=' | tr '+/' '-_'; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
openssl ecparam -name prime256v1 -genkey -noout -out "$tmp/k.pem"
PUB=$(openssl ec -in "$tmp/k.pem" -pubout -outform DER 2>/dev/null | tail -c 65 | b64url)
# DER закрытого ключа P-256: 7 байт заголовка, затем 32 байта ключа
PRIV=$(openssl ec -in "$tmp/k.pem" -outform DER 2>/dev/null | dd bs=1 skip=7 count=32 2>/dev/null | b64url)
DOMAIN=$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)

sed -i "s|^VAPID_PUBLIC_KEY=.*|VAPID_PUBLIC_KEY=$PUB|; s|^VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$PRIV|" "$ENV_FILE"
if grep -qE '^VAPID_SUBJECT=(mailto:)?$' "$ENV_FILE"; then
  sed -i "s|^VAPID_SUBJECT=.*|VAPID_SUBJECT=https://${DOMAIN:-localhost}|" "$ENV_FILE"
fi
grep -q '^VAPID_PUBLIC_KEY=' "$ENV_FILE" || printf 'VAPID_PUBLIC_KEY=%s\nVAPID_PRIVATE_KEY=%s\nVAPID_SUBJECT=https://%s\n' "$PUB" "$PRIV" "${DOMAIN:-localhost}" >> "$ENV_FILE"
echo "Ключи VAPID записаны в $ENV_FILE"
