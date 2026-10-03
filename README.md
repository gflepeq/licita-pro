# LiciApp

Detecta y gana licitaciones del Estado de Chile con IA. LiciApp se conecta a la
API oficial de **Mercado Público (ChileCompra)**, prioriza las licitaciones y
Compras Ágiles según el perfil de cada empresa y analiza las bases con **Claude**.

## Funcionalidades

- **Oportunidades en vivo:** todas las licitaciones activas y compras ágiles, con
  *match* 0-100 según rubros, palabras clave y regiones; búsqueda por palabra o
  código, filtros (rubros, regiones, mecanismo, cierre, presupuesto) y detalle
  completo (cronograma, ítems, responsable, ficha oficial, agendar cierre `.ics`).
- **Resumen:** KPIs reales, cierres de los próximos 14 días, distribución por rubro y región.
- **Análisis de bases con IA:** sube el PDF y/o indica el código; obtén viabilidad,
  requisitos, plazos, criterios de evaluación, garantías, riesgos y un chat sobre las bases.
- **Adjudicaciones:** quién gana en tus rubros, por cuánto, competencia y tus órdenes de compra.
- **Guardadas, alertas, planes (Flow.cl) y panel Super Admin.**

## Desarrollo

```bash
cp .env.example .env.local
npm install
npm run dev
```

Ver [DEPLOY.md](./DEPLOY.md) para variables de entorno y despliegue.
