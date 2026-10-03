# Deploy de LiciApp (Elestio)

LiciApp corre en **Elestio**, en el servicio CI/CD `cicd-nfyuh`, con dos pipelines:

| Pipeline | Qué es | Detalle |
|---|---|---|
| `liciapp` | La app (Next.js, imagen Docker de este repo) | GitHub `gflepeq/licita-pro`, rama `main`. Cada `git push` a `main` redespliega solo. |
| `liciapp-db` | Postgres 18 + pgAdmin (plantilla de Elestio) | Contraseña = `SOFTWARE_PASSWORD` en sus variables de entorno. |

**Dominios:** `liciapp.cl` y `www.liciapp.cl` (SSL automático de Elestio). DNS en mhost.cl:
`liciapp.cl` → A `159.195.107.47` · `www.liciapp.cl` → CNAME `liciapp-u6837.vm.elestio.app`.

**Puertos (`liciapp`):** HTTPS 443 → host `172.17.0.1:3003` → contenedor `3000`.
**Puertos (`liciapp-db`):** Postgres en `172.17.0.1:5433` (interno) y TCP público `25433`; pgAdmin en `8091`.

## Variables de entorno (`liciapp` → Build & Deploy → Environment variables)

| Variable | Descripción |
|---|---|
| `AUTH_SECRET` | Secreto de sesiones. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MERCADO_PUBLICO_TICKET` | Ticket de la API de ChileCompra |
| `DATABASE_URL` | `postgresql://postgres:<SOFTWARE_PASSWORD>@172.17.0.1:5433/postgres?sslmode=disable` |
| `APP_URL` | `https://liciapp.cl` |
| `ADMIN_EMAILS` | Emails con acceso a `/admin`, separados por coma |
| `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_API_URL` | Pagos con Flow.cl (opcional) |
| `COMPRA_AGIL_API_BASE`, `COMPRA_AGIL_API_TICKET` | API de Compra Ágil (opcional; sin ella el plan Trial no ve oportunidades) |

Las tablas se crean solas en el primer arranque. Tras cambiar variables: **Apply Changes**.

## Admin

El primer usuario que se registra (o cualquiera listado en `ADMIN_EMAILS`) queda como admin.
Para promover a otro usuario, con `DATABASE_URL` apuntando al puerto público:

```bash
DATABASE_URL='postgresql://postgres:<clave>@liciapp-db-u6837.vm.elestio.app:25433/postgres?sslmode=disable' \
  node scripts/make-admin.mjs correo@ejemplo.cl
```

## Docker local

```bash
docker build -t liciapp .
docker run -p 3000:3000 -e AUTH_SECRET=... -e MERCADO_PUBLICO_TICKET=... -e DATABASE_URL=... liciapp
```
