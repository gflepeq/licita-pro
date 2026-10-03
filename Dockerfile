# syntax=docker/dockerfile:1
# Imagen autocontenida para LiciApp (Next.js 16 + Postgres/Supabase).
# Usa la salida "standalone" de Next. Variables necesarias en runtime:
# AUTH_SECRET, MERCADO_PUBLICO_TICKET, DATABASE_URL, APP_URL, FLOW_*, ADMIN_EMAILS.

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# --- Dependencias ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
ENV BUILD_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
