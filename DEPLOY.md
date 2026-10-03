# Deploy de LiciApp

Stack: **Next.js 16** en **Vercel** + **Postgres (Supabase)** + API de **Mercado Público** + **Claude** (análisis de bases).

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `AUTH_SECRET` | sí | Secreto de sesiones. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DATABASE_URL` | sí | Connection string del **pooler** de Supabase (modo Transaction, puerto 6543). Las tablas se crean solas. |
| `MERCADO_PUBLICO_TICKET` | sí | Ticket de la API de ChileCompra (https://api.mercadopublico.cl). Sin él, la app muestra datos de demostración. |
| `COMPRA_AGIL_API_TICKET` | no | Ticket de la API v2 de Compra Ágil (por defecto, el mismo de arriba). |
| `CRON_SECRET` | recomendado | Protege `/api/cron/mercadopublico`. |
| `ANTHROPIC_API_KEY` | recomendado | Activa el análisis real de bases con IA. Sin ella funciona en modo demostración. |
| `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_API_URL`, `APP_URL` | pagos | Integración con Flow.cl. |
| `ADMIN_EMAILS` | no | Emails con acceso a `/admin`, separados por coma. |

## Cómo se conecta con Mercado Público

- **Pool de oportunidades:** se descargan *todas* las licitaciones activas
  (`licitaciones.json?estado=activas`) y las compras ágiles recientes (API v2).
  El resultado se guarda en Postgres y se sirve al instante; cada 20 minutos se
  refresca en segundo plano (*stale-while-revalidate*), sin bloquear al usuario.
- **Detalles:** el detalle de cada licitación (organismo, región, monto, fechas,
  ítems) se pide una sola vez y se guarda en la tabla `mp_detalle`. Cada
  actualización completa los que faltan, priorizando los relevantes. La API
  rechaza peticiones simultáneas, por eso todas pasan por una cola serial con
  reintentos.
- **Cron:** `vercel.json` programa una sincronización diaria. Para mantener los
  detalles al día durante la jornada, agrega un cron externo (ej. cron-job.org)
  cada 30–60 min a `GET https://TU-DOMINIO/api/cron/mercadopublico` con el header
  `Authorization: Bearer <CRON_SECRET>`. El panel `/admin` muestra el estado del
  conector y permite sincronizar a mano.
- **Adjudicaciones:** licitaciones adjudicadas de los últimos días que calzan con
  el perfil, con proveedor ganador y monto. Con el RUT de la empresa se consultan
  sus órdenes de compra (`Empresas/BuscarProveedor` + `ordenesdecompra.json`).

## Pasos (Vercel + Supabase)

1. Crea el proyecto en https://supabase.com y copia la connection string del pooler.
2. En Vercel: **Add New → Project** → importa el repositorio.
3. Agrega las variables de entorno de la tabla.
4. **Deploy**. La primera visita al dashboard llena la caché (≈10 s); después es instantáneo.

## Desarrollo local

```bash
cp .env.example .env.local   # completa las variables
npm install
npm run dev
```

Para probar sin ticket real puedes apuntar `MERCADO_PUBLICO_API_BASE` y
`COMPRA_AGIL_API_BASE` a un mock local.
