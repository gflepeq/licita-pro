# syntax=docker/dockerfile:1
# Imagen autocontenida para Licitapro (Next.js 16 + better-sqlite3).
# Usa la salida "standalone" de Next. La base SQLite vive en /data (monta un
# volumen persistente ahí y define DATA_DIR=/data).

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# --- Dependencias (incluye toolchain para compilar better-sqlite3 si hiciera falta) ---
FROM base AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Asegura el binario nativo de better-sqlite3 en la salida standalone.
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

USER nextjs
EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "server.js"]
