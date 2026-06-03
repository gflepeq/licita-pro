# Deploy de Licitapro

La app es un servidor Next.js 16 de **larga duración** con **SQLite en disco**
(`better-sqlite3`). Necesita: un proceso persistente (no serverless) y un
**volumen persistente** para conservar usuarios y oportunidades guardadas.

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `AUTH_SECRET` | sí | Secreto para firmar sesiones. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MERCADO_PUBLICO_TICKET` | sí | Ticket de la API de ChileCompra |
| `DATA_DIR` | en prod | Carpeta del volumen persistente (p. ej. `/data`) |

---

## Opción A — Railway (recomendada, sin cambios de código)

1. Crea cuenta en https://railway.app (login con GitHub).
2. **New Project → Deploy from GitHub repo** → elige `gflepeq/licita-pro`.
   Railway detecta Next.js y lo construye automáticamente.
3. En **Variables**, agrega `AUTH_SECRET`, `MERCADO_PUBLICO_TICKET` y `DATA_DIR=/data`.
4. En **Settings → Volumes**, crea un volumen montado en `/data`.
5. Deploy. Railway expone una URL pública (`*.up.railway.app`); puedes añadir dominio propio.

> Costo: el plan Hobby (~US$5/mes) habilita volúmenes persistentes.

## Opción B — Render

1. Cuenta en https://render.com (login con GitHub).
2. **New → Web Service** → conecta `gflepeq/licita-pro`.
   - Build: `npm install && npm run build`  ·  Start: `npm start`
3. Variables de entorno: `AUTH_SECRET`, `MERCADO_PUBLICO_TICKET`, `DATA_DIR=/data`.
4. **Disks** → agrega un disco montado en `/data` (requiere instancia de pago).

## Opción C — Fly.io / cualquier VPS con Docker

Hay un `Dockerfile` listo (salida standalone + volumen `/data`).

```bash
fly launch --no-deploy           # crea la app
fly volumes create data --size 1 # volumen persistente
fly secrets set AUTH_SECRET=... MERCADO_PUBLICO_TICKET=...
# en fly.toml: [mounts] source="data" destination="/data"  y  DATA_DIR=/data
fly deploy
```

En un VPS:
```bash
docker build -t licitapro .
docker run -d -p 80:3000 -v licitapro_data:/data \
  -e AUTH_SECRET=... -e MERCADO_PUBLICO_TICKET=... -e DATA_DIR=/data licitapro
```

---

## Alternativa serverless (Vercel) — requiere migración

Vercel **no** sirve para el stack actual sin cambios: el filesystem es de solo
lectura (SQLite no persiste) y las funciones tienen timeout corto (el
enriquecimiento inicial ~18s no cabe). Para usar Vercel habría que:

1. Migrar la capa de datos (`src/lib/db.ts`) de `better-sqlite3` a **Turso**
   (`@libsql/client`, SQLite-compatible, async) o Postgres (Neon/Supabase).
2. Hacer asíncronas las funciones de DB y sus llamadas.
3. Reducir/diferir el enriquecimiento de la API o subir `maxDuration`.

Si prefieres este camino, avísame y hago la migración.
