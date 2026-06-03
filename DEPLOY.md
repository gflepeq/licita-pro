# Deploy de Licitapro

La base de datos usa **libSQL** (`@libsql/client`):
- **Local:** archivo SQLite en `./data` (o `DATA_DIR`). No requiere configurar nada.
- **Producción:** **Turso** (libSQL gestionado, SQLite-compatible) vía
  `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.

Esto permite desplegar en **Vercel** (serverless) de forma **gratuita y permanente**.

## Variables de entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `AUTH_SECRET` | siempre | Secreto de sesiones. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MERCADO_PUBLICO_TICKET` | siempre | Ticket de la API de ChileCompra |
| `TURSO_DATABASE_URL` | producción | URL `libsql://...` de la base en Turso |
| `TURSO_AUTH_TOKEN` | producción | Token de acceso a la base Turso |

---

## Opción A — Vercel + Turso (recomendada: gratis y permanente)

### 1. Crear la base en Turso
```bash
# instala el CLI (https://docs.turso.tech)
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup            # crea cuenta (o turso auth login)
turso db create licitapro
turso db show licitapro --url        # -> TURSO_DATABASE_URL
turso db tokens create licitapro     # -> TURSO_AUTH_TOKEN
```
(El esquema se crea solo al primer arranque de la app.)

### 2. Desplegar en Vercel
1. https://vercel.com → login con GitHub.
2. **Add New → Project** → importa `gflepeq/licita-pro`.
3. En **Environment Variables** agrega: `AUTH_SECRET`, `MERCADO_PUBLICO_TICKET`,
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
4. **Deploy**. Vercel te da una URL permanente `*.vercel.app` (puedes añadir dominio propio).

> Las páginas del dashboard tienen `maxDuration = 60` para que el enriquecimiento
> inicial de la API (~15-18s) no expire. El resultado se cachea ~30 min.

---

## Opción B — Servidor persistente con disco (Railway / Render / Fly / VPS)

No necesita Turso: usa el SQLite local sobre un volumen montado en `DATA_DIR`.

- **Railway/Render:** conecta el repo de GitHub, define `AUTH_SECRET`,
  `MERCADO_PUBLICO_TICKET`, `DATA_DIR=/data` y monta un volumen en `/data`.
- **Docker (Fly/VPS):** hay un `Dockerfile` (salida standalone, volumen `/data`).
  ```bash
  docker build -t licitapro .
  docker run -d -p 80:3000 -v licitapro_data:/data \
    -e AUTH_SECRET=... -e MERCADO_PUBLICO_TICKET=... -e DATA_DIR=/data licitapro
  ```
