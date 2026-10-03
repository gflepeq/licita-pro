# Deploy de LiciApp en Elest.io

La app se despliega como **pipeline CI/CD** (Docker compose) desde GitHub, en el
mismo servidor (VM) que ya tienes contratado.

## Archivos

- `Dockerfile`: build de producción (Next.js standalone, puerto 3000, healthcheck).
- `docker-compose.yml`: servicio `app` + servicio `cron`, que sincroniza Mercado
  Público cada 30 min llamando a `/api/cron/mercadopublico`.

## Crear el pipeline

1. En el panel de Elest.io: **CI/CD → Create new pipeline**.
2. Destino: **Deploy on existing VM** → elige tu servicio actual.
3. Fuente: **GitHub** → repositorio `gflepeq/licita-pro`, rama `main`
   (o `claude/relaxed-ramanujan-g1id6l` para probar antes de fusionar).
4. Modo de build: **Docker compose** (usa el `docker-compose.yml` del repo).
5. **Environment variables**: copia las mismas de Vercel:

   | Variable | Valor |
   |---|---|
   | `AUTH_SECRET` | igual que en Vercel (si cambia, se cierran las sesiones) |
   | `DATABASE_URL` | la de Supabase (pooler, puerto 6543) |
   | `MERCADO_PUBLICO_TICKET` | ticket de ChileCompra |
   | `CRON_SECRET` | una cadena aleatoria larga |
   | `ANTHROPIC_API_KEY` | clave de Anthropic (análisis con IA) |
   | `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_API_URL` | Flow.cl |
   | `APP_URL` | `https://www.liciapp.cl` (o el subdominio de prueba) |
   | `ADMIN_EMAILS` | emails admin, separados por coma |
   | `APP_PORT` | un puerto libre en la VM (ej. `3010`) si el 3000 está ocupado |

6. **Reverse proxy**: apunta el dominio (ej. `nuevo.liciapp.cl`) al puerto
   interno `172.17.0.1:<APP_PORT>`. Elest.io emite el certificado SSL.
7. **Create / Deploy**. Cada push a la rama elegida vuelve a desplegar.

## Pasar a producción

1. Prueba en el subdominio temporal (login, oportunidades, `/admin` → estado del
   conector, un pago de prueba en Flow sandbox).
2. Agrega `www.liciapp.cl` y `liciapp.cl` al reverse proxy del pipeline.
3. Cambia el DNS de `liciapp.cl` desde Vercel a la IP de tu VM de Elest.io.
4. Cuando todo funcione, desactiva el proyecto en Vercel.

## Probar localmente

```bash
cp .env.example .env    # completa las variables
docker compose up --build
```
