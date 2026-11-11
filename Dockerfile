# Образ приложения «Деканыч» (задача 3.2). Сборка: docker compose build
# ARG до первого FROM виден в строках FROM.
# Базовый образ на Debian (glibc) — нужен для argon2 и движка Prisma.
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS base
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma нужен OpenSSL. В slim-образе его нет — ставим; в полном образе шаг пропускается.
RUN if ! command -v openssl >/dev/null; then \
      apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
      && rm -rf /var/lib/apt/lists/*; \
    fi
WORKDIR /app

# Зависимости
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Сборка. Этот же этап используется для миграций и сидов (в нём есть Prisma CLI и tsx).
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# Минимальный образ для запуска
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]
