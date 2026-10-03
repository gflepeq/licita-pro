import "server-only";
import { getSql, cacheGet, cacheSet } from "@/lib/db";
import {
  caGet,
  cleanRegion,
  mapEstadoCA,
  mapEstadoLic,
  mpFecha,
  mpGetRetry,
  MP_TICKET,
  sleep,
} from "@/lib/mp-api";

// Sincronización en segundo plano del catálogo de Mercado Público → tabla
// `oportunidades`. Corre dentro del servidor de Next (ver src/instrumentation.ts):
//  1. Lista de licitaciones activas (1 llamada) cada 20 min.
//  2. Detalle de cada licitación (organismo, monto, región, productos), de a una.
//  3. Compras Ágiles publicadas (API v2, ~18 s por página) cada 15 min por cambios,
//     y barrido completo cada 6 h.

const LISTA_CADA_MS = 20 * 60_000;
const CA_CAMBIOS_CADA_MS = 15 * 60_000;
const CA_COMPLETO_CADA_MS = 6 * 3600_000;
const DETALLE_PAUSA_MS = 250;
// Cada página de Compra Ágil ocupa el ticket ~18 s: entre páginas dejamos avanzar los detalles.
const CA_PAUSA_PAGINAS_MS = 8000;

export interface SyncStatus {
  iniciado: string | null;
  listaAt: string | null;
  listaTotal: number;
  caAt: string | null;
  caCompletoAt: string | null;
  caTotal: number;
  detalles: number;
  errores: number;
  ultimoError: string | null;
}

const g = globalThis as unknown as { __mpSync?: SyncStatus };

function status(): SyncStatus {
  return (g.__mpSync ??= {
    iniciado: null,
    listaAt: null,
    listaTotal: 0,
    caAt: null,
    caCompletoAt: null,
    caTotal: 0,
    detalles: 0,
    errores: 0,
    ultimoError: null,
  });
}

export function getSyncStatus(): SyncStatus {
  return { ...status() };
}

function fallo(where: string, e: unknown) {
  const s = status();
  s.errores += 1;
  s.ultimoError = `${new Date().toISOString()} ${where}: ${String((e as Error)?.message ?? e)}`;
  console.error("[mp-sync]", where, e);
}

type Fila = {
  codigo: string;
  tipo: string;
  nombre: string;
  descripcion?: string;
  organismo?: string;
  unidad?: string;
  region?: string;
  monto?: number;
  moneda?: string;
  estado: string;
  tipo_lic?: string;
  publicada?: string | null;
  cierre?: string | null;
};

// ---------- 1. Lista de licitaciones activas ----------
async function syncListaLicitaciones() {
  const data = await mpGetRetry<{
    Listado?: { CodigoExterno?: string; Nombre?: string; CodigoEstado?: number; FechaCierre?: string }[];
  }>("licitaciones.json?estado=activas", 5);
  const listado = data?.Listado;
  if (!Array.isArray(listado) || !listado.length) throw new Error("lista de licitaciones vacía");

  const sql = await getSql();
  const filas = listado
    .filter((x) => x.CodigoExterno && x.Nombre)
    .map((x) => ({
      codigo: String(x.CodigoExterno),
      tipo: "Licitación",
      nombre: String(x.Nombre).trim(),
      estado: mapEstadoLic(x.CodigoEstado),
      cierre: mpFecha(x.FechaCierre),
    }));

  for (let i = 0; i < filas.length; i += 500) {
    const lote = filas.slice(i, i + 500);
    await sql`
      INSERT INTO oportunidades ${sql(lote, "codigo", "tipo", "nombre", "estado", "cierre")}
      ON CONFLICT (codigo) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        estado = EXCLUDED.estado,
        cierre = COALESCE(EXCLUDED.cierre, oportunidades.cierre),
        updated_at = now()`;
  }

  // Licitaciones que salieron de la lista de activas: ya no reciben ofertas.
  const activos = filas.map((f) => f.codigo);
  await sql`
    UPDATE oportunidades SET estado = 'Cerrada', updated_at = now()
    WHERE tipo = 'Licitación' AND estado = 'Publicada' AND codigo <> ALL(${sql.array(activos)})`;

  const s = status();
  s.listaAt = new Date().toISOString();
  s.listaTotal = filas.length;
}

// ---------- 2. Detalle de licitaciones ----------
type Detalle = {
  Nombre?: string;
  Descripcion?: string;
  CodigoEstado?: number;
  Estado?: string;
  Tipo?: string;
  Moneda?: string;
  MontoEstimado?: number | null;
  Comprador?: { NombreOrganismo?: string; NombreUnidad?: string; RegionUnidad?: string };
  Fechas?: { FechaPublicacion?: string; FechaCierre?: string };
  FechaCierre?: string;
  Items?: {
    Listado?: {
      CodigoProducto?: number;
      CodigoCategoria?: string;
      Categoria?: string;
      NombreProducto?: string;
      Descripcion?: string;
      UnidadMedida?: string;
      Cantidad?: number;
    }[];
  };
};

// Intentos fallidos por código (en memoria): tras 3 se marca para no reintentar en bucle.
const fallos = new Map<string, number>();

async function enriquecerUna(codigo: string): Promise<boolean> {
  // La API rechaza a veces con "peticiones simultáneas" aunque vayamos en serie: reintentar el mismo.
  const data = await mpGetRetry<{ Listado?: Detalle[] }>(
    `licitaciones.json?codigo=${encodeURIComponent(codigo)}`,
    5
  );
  const d = data?.Listado?.[0];
  const sql = await getSql();
  if (!d) {
    const n = (fallos.get(codigo) ?? 0) + 1;
    fallos.set(codigo, n);
    // Respuesta válida sin detalle, o 3 fallos: no insistir.
    if (data || n >= 3) {
      fallos.delete(codigo);
      await sql`UPDATE oportunidades SET detalle_at = now() WHERE codigo = ${codigo}`;
    }
    return false;
  }
  fallos.delete(codigo);
  const items = (d.Items?.Listado ?? []).slice(0, 60).map((it) => ({
    nombre: String(it.NombreProducto ?? "").trim(),
    descripcion: String(it.Descripcion ?? "").trim().slice(0, 400),
    categoria: String(it.Categoria ?? "").trim(),
    unspsc: String(it.CodigoCategoria ?? it.CodigoProducto ?? ""),
    cantidad: Number(it.Cantidad) || 0,
    unidad: String(it.UnidadMedida ?? "").trim(),
  }));
  // Categoría UNSPSC: último nivel legible de cada ítem (sin repetir).
  const categorias = [
    ...new Set(items.map((i) => i.categoria.split("/").pop()!.trim()).filter(Boolean)),
  ].slice(0, 8);
  const segmentos = [...new Set(items.map((i) => i.unspsc.slice(0, 2)).filter((x) => x.length === 2))];

  await sql`
    UPDATE oportunidades SET
      nombre = COALESCE(NULLIF(${String(d.Nombre ?? "").trim()}, ''), nombre),
      descripcion = ${String(d.Descripcion ?? "").trim().slice(0, 4000)},
      organismo = ${String(d.Comprador?.NombreOrganismo ?? "").trim()},
      unidad = ${String(d.Comprador?.NombreUnidad ?? "").trim()},
      region = ${cleanRegion(d.Comprador?.RegionUnidad)},
      monto = ${Math.round(Number(d.MontoEstimado) || 0)},
      moneda = ${String(d.Moneda ?? "CLP")},
      estado = ${mapEstadoLic(d.CodigoEstado, d.Estado)},
      tipo_lic = ${String(d.Tipo ?? "")},
      publicada = ${mpFecha(d.Fechas?.FechaPublicacion)},
      cierre = COALESCE(${mpFecha(d.Fechas?.FechaCierre ?? d.FechaCierre)}, cierre),
      categorias = ${categorias.join(" | ")},
      unspsc = ${segmentos.length ? ` ${segmentos.join(" ")} ` : ""},
      items = ${JSON.stringify(items)},
      detalle_at = now(),
      updated_at = now()
    WHERE codigo = ${codigo}`;
  status().detalles += 1;
  return true;
}

async function bucleDetalles() {
  for (;;) {
    try {
      const sql = await getSql();
      // Primero las que cierran antes (son las más urgentes para el usuario).
      const pendientes = await sql<{ codigo: string }[]>`
        SELECT codigo FROM oportunidades
        WHERE tipo = 'Licitación' AND detalle_at IS NULL AND estado = 'Publicada'
        ORDER BY cierre ASC NULLS LAST
        LIMIT 50`;
      if (!pendientes.length) {
        await sleep(60_000);
        continue;
      }
      const t0 = Date.now();
      let ok = 0;
      for (const { codigo } of pendientes) {
        try {
          if (await enriquecerUna(codigo)) ok += 1;
        } catch (e) {
          fallo("detalle " + codigo, e);
        }
        await sleep(DETALLE_PAUSA_MS);
      }
      console.log(
        `[mp-sync] detalle: ${ok}/${pendientes.length} licitaciones en ${Math.round((Date.now() - t0) / 1000)} s`
      );
    } catch (e) {
      fallo("bucle detalles", e);
      await sleep(30_000);
    }
  }
}

// ---------- 3. Compras Ágiles (API v2) ----------
type CAItem = {
  codigo?: string;
  nombre?: string;
  estado?: { codigo?: string };
  fechas?: { fecha_publicacion?: string; fecha_cierre?: string };
  montos?: { moneda?: string; monto_disponible_clp?: number; monto_disponible?: number };
  institucion?: { organismo_comprador?: string; unidad_compra?: string; nombre_region?: string };
};
type CAPage = { items?: CAItem[]; paginacion?: { total_paginas?: number; total_resultados?: number } };

async function guardarCA(items: CAItem[]) {
  const filas: Fila[] = items
    .filter((it) => it.codigo && it.nombre)
    .map((it) => ({
      codigo: String(it.codigo),
      tipo: "Compra Ágil",
      nombre: String(it.nombre).trim(),
      organismo: String(it.institucion?.organismo_comprador ?? "").trim(),
      unidad: String(it.institucion?.unidad_compra ?? "").trim(),
      region: cleanRegion(it.institucion?.nombre_region),
      monto: Math.round(Number(it.montos?.monto_disponible_clp ?? it.montos?.monto_disponible) || 0),
      moneda: "CLP",
      estado: mapEstadoCA(it.estado?.codigo),
      publicada: mpFecha(it.fechas?.fecha_publicacion),
      cierre: mpFecha(it.fechas?.fecha_cierre),
    }));
  if (!filas.length) return;
  const sql = await getSql();
  await sql`
    INSERT INTO oportunidades ${sql(
      filas as Record<string, unknown>[],
      "codigo", "tipo", "nombre", "organismo", "unidad", "region", "monto", "moneda", "estado", "publicada", "cierre"
    )}
    ON CONFLICT (codigo) DO UPDATE SET
      nombre = EXCLUDED.nombre, organismo = EXCLUDED.organismo, unidad = EXCLUDED.unidad,
      region = EXCLUDED.region, monto = EXCLUDED.monto, estado = EXCLUDED.estado,
      publicada = EXCLUDED.publicada, cierre = EXCLUDED.cierre, updated_at = now()`;
}

async function barrerCA(filtro: string): Promise<number> {
  let pagina = 1;
  let totalPaginas = 1;
  let total = 0;
  while (pagina <= totalPaginas) {
    const qs = `?${filtro}&tamano_pagina=50&numero_pagina=${pagina}`;
    // La API v2 a veces corta páginas lentas: un reintento antes de abortar.
    const p = (await caGet<CAPage>(qs)) ?? (await sleep(5000), await caGet<CAPage>(qs));
    if (!p) throw new Error(`compra ágil: falló la página ${pagina}`);
    await guardarCA(p.items ?? []);
    totalPaginas = p.paginacion?.total_paginas ?? totalPaginas;
    total = p.paginacion?.total_resultados ?? total;
    if (pagina % 10 === 0 || pagina === totalPaginas)
      console.log(`[mp-sync] compra ágil (${filtro}): página ${pagina}/${totalPaginas}`);
    pagina += 1;
    if (pagina <= totalPaginas) await sleep(CA_PAUSA_PAGINAS_MS);
  }
  return total;
}

async function syncCompraAgilCompleta() {
  const desde = new Date().toISOString();
  const total = await barrerCA("estado=publicada");
  const sql = await getSql();
  // Las publicadas que no se tocaron en este barrido ya no están publicadas.
  await sql`
    UPDATE oportunidades SET estado = 'Cerrada', updated_at = now()
    WHERE tipo = 'Compra Ágil' AND estado = 'Publicada' AND updated_at < ${desde}`;
  const s = status();
  s.caCompletoAt = s.caAt = new Date().toISOString();
  s.caTotal = total;
}

async function syncCompraAgilCambios() {
  // Cambios recientes en cualquier estado (capta nuevas y cierres).
  await barrerCA(`ttl_cambio_ms=${CA_CAMBIOS_CADA_MS * 2}`);
  status().caAt = new Date().toISOString();
}

// ---------- Orquestación ----------
async function cadaTanto(nombre: string, cadaMs: number, fn: () => Promise<void>) {
  for (;;) {
    const t0 = Date.now();
    try {
      await fn();
    } catch (e) {
      fallo(nombre, e);
    }
    await sleep(Math.max(60_000, cadaMs - (Date.now() - t0)));
  }
}

async function bucleCompraAgil() {
  for (;;) {
    try {
      const ultimo = Number((await cacheGet("ca_completo_at")) ?? 0);
      if (Date.now() - ultimo > CA_COMPLETO_CADA_MS) {
        await syncCompraAgilCompleta();
        await cacheSet("ca_completo_at", String(Date.now()));
      } else {
        await syncCompraAgilCambios();
      }
    } catch (e) {
      fallo("compra ágil", e);
    }
    await sleep(CA_CAMBIOS_CADA_MS);
  }
}

/** Arranca la sincronización una sola vez por proceso. */
export function startMpSync() {
  const s = status();
  if (s.iniciado || !MP_TICKET || !process.env.DATABASE_URL) return;
  s.iniciado = new Date().toISOString();
  console.log("[mp-sync] iniciando sincronización con Mercado Público");
  void cadaTanto("lista licitaciones", LISTA_CADA_MS, syncListaLicitaciones);
  void bucleDetalles();
  void bucleCompraAgil();
}
