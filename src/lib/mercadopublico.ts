import "server-only";
import { after } from "next/server";
import {
  licitaciones as mockLicitaciones,
  adjudicaciones as mockAdjudicaciones,
  hoyChile,
  type EstadoLicitacion,
  type Licitacion,
} from "@/lib/data";
import { normalizarRegion } from "@/lib/catalogos";

/* =====================================================================
 * Cliente de la API de Mercado Público (ChileCompra)
 *
 *  v1 (api.mercadopublico.cl, ticket en query):
 *    - licitaciones.json?estado=activas        → todas las licitaciones abiertas
 *    - licitaciones.json?codigo=XXXX           → detalle (organismo, monto, fechas, ítems…)
 *    - licitaciones.json?fecha=ddmmaaaa&estado=adjudicada
 *    - ordenesdecompra.json?fecha=…&CodigoProveedor=… / ?codigo=…
 *    - Empresas/BuscarProveedor?rutempresaproveedor=…
 *  v2 (api2.mercadopublico.cl, ticket en header): Compra Ágil.
 *
 *  La v1 rechaza peticiones simultáneas (Codigo 10500), así que todas pasan
 *  por una cola serial con espaciado y reintentos. Los detalles se guardan en
 *  Postgres (tabla mp_detalle) y se van acumulando: cada actualización solo
 *  pide los que faltan.
 * ===================================================================== */

const BASE =
  process.env.MERCADO_PUBLICO_API_BASE || "https://api.mercadopublico.cl/servicios/v1/publico";
const TICKET = process.env.MERCADO_PUBLICO_TICKET || "";
const CA_BASE = process.env.COMPRA_AGIL_API_BASE || "https://api2.mercadopublico.cl";
const CA_TICKET = process.env.COMPRA_AGIL_API_TICKET || TICKET;

const POOL_TTL_MS = 20 * 60_000; // el pool se considera fresco 20 min
const REFRESH_BUDGET_MS = 25_000; // tiempo para enriquecer en segundo plano
const FIRST_LOAD_BUDGET_MS = 9_000; // primera carga (sin caché): bloqueante, acotada
const MIN_GAP_MS = 250; // espacio mínimo entre peticiones a la v1
const MAX_ITEMS_CLIENTE = 300; // oportunidades enviadas al navegador

export const tieneTicket = () => !!TICKET;

export interface LicitacionesResult {
  items: Licitacion[];
  source: "live" | "demo";
  fetchedAt: string;
  total: number; // total de oportunidades vigentes en el pool
  totales: Record<Licitacion["tipo"], number>; // vigentes por tipo
  enriquecidas: number; // cuántas tienen detalle completo
  note?: string;
}

const contarTipos = (ls: Licitacion[]): Record<Licitacion["tipo"], number> => ({
  Licitación: ls.filter((l) => l.tipo === "Licitación").length,
  "Compra Ágil": ls.filter((l) => l.tipo === "Compra Ágil").length,
});

export interface PerfilMatch {
  rubros: string[];
  regiones?: string[];
  keywords?: string[];
}

type Json = Record<string, unknown>;

const g = globalThis as unknown as {
  __mpQueue?: Promise<unknown>;
  __mpLast?: number;
  __mpLastError?: string;
  __mpPool?: Pool;
  __mpRefreshing?: Promise<void> | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Normaliza texto para búsqueda (minúsculas, sin acentos).
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* ---------------------------- HTTP ---------------------------- */

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const prev = g.__mpQueue ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(async () => {
      const wait = (g.__mpLast ?? 0) + MIN_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      try {
        return await fn();
      } finally {
        g.__mpLast = Date.now();
      }
    });
  g.__mpQueue = next.catch(() => {});
  return next;
}

type FetchResult = { ok: true; data: Json } | { ok: false; retry: boolean };

async function fetchOnce(url: string, timeoutMs: number): Promise<FetchResult> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await res.text();
    let data: Json | null = null;
    try {
      data = JSON.parse(text) as Json;
    } catch {
      data = null;
    }
    // Errores de la API: { Codigo, Mensaje } (a veces con HTTP 200, a veces 500).
    if (data && "Mensaje" in data && !("Listado" in data) && !("listaEmpresas" in data)) {
      const msg = String(data.Mensaje ?? "");
      g.__mpLastError = `${data.Codigo ?? ""} ${msg}`.trim();
      const fatal = /ticket/i.test(msg) && !/simult/i.test(msg);
      return { ok: false, retry: !fatal };
    }
    if (!res.ok || !data) {
      g.__mpLastError = `HTTP ${res.status}`;
      return { ok: false, retry: res.status >= 500 || res.status === 429 };
    }
    return { ok: true, data };
  } catch (e) {
    g.__mpLastError = e instanceof Error ? e.message : "error de red";
    return { ok: false, retry: true };
  } finally {
    clearTimeout(to);
  }
}

async function mpGet(
  path: string,
  params: Record<string, string>,
  opts: { timeoutMs?: number; retries?: number; deadline?: number } = {}
): Promise<Json | null> {
  if (!TICKET) return null;
  const { timeoutMs = 10_000, retries = 2, deadline } = opts;
  const qs = new URLSearchParams({ ...params, ticket: TICKET }).toString();
  const url = `${BASE}/${path}?${qs}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (deadline && Date.now() > deadline) return null;
    const r = await enqueue(() => {
      if (deadline && Date.now() > deadline) return Promise.resolve<FetchResult>({ ok: false, retry: false });
      return fetchOnce(url, timeoutMs);
    });
    if (r.ok) return r.data;
    if (!r.retry) return null;
    await sleep(700 * (attempt + 1));
  }
  return null;
}

async function fetchCA(query: string, timeoutMs = 12_000): Promise<Json | null> {
  if (!CA_TICKET) return null;
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${CA_BASE}/v2/compra-agil${query}`, {
      signal: controller.signal,
      headers: { ticket: CA_TICKET, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Json;
    if (data?.success !== "OK") return null;
    return (data.payload as Json) ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

/* --------------------------- Helpers --------------------------- */

const str = (v: unknown) => (v == null ? "" : String(v).trim());
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

// "2026-06-12T15:00:00" (hora de Chile, sin zona) → { fecha, hora }
function splitFecha(v: unknown): { fecha: string; hora: string } {
  const s = str(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (!m) return { fecha: "", hora: "" };
  const hora = m[2] && m[2] !== "00:00" ? m[2] : "";
  return { fecha: m[1], hora };
}

const ddmmyyyy = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`;

function isoMenosDias(iso: string, dias: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

export function fichaUrl(codigo: string, tipo: Licitacion["tipo"]) {
  return tipo === "Compra Ágil"
    ? `https://buscador.mercadopublico.cl/ficha?code=${encodeURIComponent(codigo)}`
    : `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(codigo)}`;
}

function mapEstado(codigo: unknown, estado: unknown): EstadoLicitacion {
  switch (num(codigo)) {
    case 5:
      return "Publicada";
    case 6:
      return "Cerrada";
    case 7:
      return "Desierta";
    case 8:
      return "Adjudicada";
    case 18:
      return "Revocada";
    case 19:
      return "Suspendida";
  }
  const e = norm(str(estado));
  if (e.includes("cerrad")) return "Cerrada";
  if (e.includes("desiert")) return "Desierta";
  if (e.includes("adjudic")) return "Adjudicada";
  if (e.includes("revoc") || e.includes("cancel")) return "Revocada";
  if (e.includes("suspend")) return "Suspendida";
  return "Publicada";
}

// Tipos de licitación según ChileCompra (sufijo del código: 1057-412-LR26).
const TIPOS: Record<string, string> = {
  L1: "Licitación Pública menor a 100 UTM",
  LE: "Licitación Pública 100–1.000 UTM",
  LP: "Licitación Pública 1.000–2.000 UTM",
  LQ: "Licitación Pública 2.000–5.000 UTM",
  LR: "Licitación Pública mayor a 5.000 UTM",
  LS: "Licitación Pública servicios especializados",
  O1: "Licitación Pública de obras",
  E2: "Licitación Privada menor a 100 UTM",
  CO: "Licitación Privada 100–1.000 UTM",
  B2: "Licitación Privada 1.000–2.000 UTM",
  H2: "Licitación Privada 2.000–5.000 UTM",
  I2: "Licitación Privada mayor a 5.000 UTM",
  O2: "Licitación Privada de obras",
};

export function tipoDesdeCodigo(codigo: string, tipoApi?: unknown): string {
  const t = str(tipoApi).toUpperCase();
  if (TIPOS[t]) return TIPOS[t];
  const m = codigo.toUpperCase().match(/-([A-Z][A-Z0-9])\d{2}$/);
  return (m && TIPOS[m[1]]) || "Licitación Pública";
}

/* ---------------------- Scoring por perfil ---------------------- */

// Palabras clave por rubro para el match semántico.
const RUBRO_KEYWORDS: Record<string, string[]> = {
  Tecnología: ["computacional", "computador", "notebook", "software", "informatic", "tecnolog", "servidor", "licencia", "sistema", "plataforma", "web", "impresora", "redes", "datos"],
  "Servicios Generales": ["aseo", "mantencion", "mantenimiento", "limpieza", "areas verdes", "jardin", "servicio de", "conserjeria"],
  Salud: ["medic", "clinic", "salud", "insumo", "hospital", "farmac", "dental", "quirurg", "laboratorio", "examen", "cesfam"],
  "Construcción y Obras": ["construccion", "obra", "edificacion", "vial", "pavimento", "mejoramiento", "reposicion", "habilitacion", "remodelacion", "ampliacion"],
  "Electricidad e Iluminación": ["luminaria", "led", "electric", "alumbrado", "iluminacion", "generador", "tablero"],
  Mobiliario: ["mobiliario", "escritorio", "silla", "estante", "mueble", "casillero"],
  Transporte: ["transporte", "traslado", "flota", "bus", "pasaje", "movilizacion", "arriendo de vehiculo"],
  Automotriz: ["vehicul", "automotriz", "neumatic", "repuesto", "lubricante", "camioneta", "combustible"],
  Alimentos: ["aliment", "comida", "racion", "abarrote", "fruta", "verdura", "colacion", "coffee", "catering", "banqueteria"],
  "Aseo e Higiene": ["aseo", "higiene", "sanitiz", "desinfec", "papel higienico", "detergente", "desratiz"],
  Seguridad: ["seguridad", "vigilancia", "guardia", "camara", "alarma", "cctv", "extintor"],
  Consultoría: ["consultoria", "asesoria", "estudio", "diagnostico", "capacitacion", "auditoria", "evaluacion"],
  "Publicidad y Marketing": ["publicidad", "marketing", "difusion", "diseno", "grafic", "impresion", "audiovisual", "evento"],
  "Material de Oficina": ["oficina", "papeleria", "utiles", "toner", "tinta", "resma", "articulos de escritorio"],
};

// Para priorizar qué detalles pedir primero: cualquier palabra de cualquier rubro.
const TODAS_KW = Array.from(new Set(Object.values(RUBRO_KEYWORDS).flat()));

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

/** Score 0-100 según rubros, palabras clave y regiones del usuario. */
export function scoreOpportunity(
  texto: string,
  perfil: PerfilMatch,
  codigo: string,
  region?: string
): { score: number; matched: string[]; enRegion: boolean } {
  const t = norm(texto);
  const spread = hash(codigo) % 5; // desempate determinista
  const regiones = perfil.regiones ?? [];
  const enRegion = !!region && regiones.includes(region);
  const bonusRegion = enRegion ? 4 : 0;

  const kwHits = (perfil.keywords ?? []).filter((k) => t.includes(norm(k))).length;

  const matched: string[] = [];
  let maxHits = 0;
  for (const r of perfil.rubros) {
    const kws = (RUBRO_KEYWORDS[r] ?? [r]).map(norm);
    const hits = kws.filter((k) => t.includes(k)).length;
    if (hits > 0) {
      matched.push(r);
      maxHits = Math.max(maxHits, hits);
    }
  }

  if (!perfil.rubros.length && !kwHits) {
    return { score: Math.min(99, 66 + spread + bonusRegion), matched, enRegion };
  }

  let score: number;
  if (kwHits > 0) {
    score = 90 + Math.min(kwHits, 2) * 2 + (matched.length ? 2 : 0);
  } else if (matched.length === 0) {
    score = 45 + spread;
  } else {
    const base = matched.length >= 2 ? 86 : maxHits >= 2 ? 82 : 76;
    score = base + spread;
  }
  return { score: Math.min(99, score + bonusRegion), matched, enRegion };
}

/* -------------------- Detalle de licitaciones -------------------- */

export interface LicitacionItem {
  correlativo: number;
  categoria: string;
  producto: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  adjudicacion?: { proveedor: string; rut: string; cantidad: number; montoUnitario: number };
}

export interface LicitacionDetalle {
  codigo: string;
  nombre: string;
  descripcion: string;
  estado: EstadoLicitacion;
  tipo: string;
  organismo: string;
  unidad: string;
  rutUnidad: string;
  comuna: string;
  region: string;
  direccion: string;
  monto: number;
  moneda: string;
  montoVisible: boolean;
  fuenteFinanciamiento: string;
  contrato: string; // duración del contrato (texto)
  responsable: { nombre: string; email: string; fono: string };
  fechas: { label: string; fecha: string; hora: string }[];
  publicada: string;
  cierre: string;
  cierreHora: string;
  items: LicitacionItem[];
  categorias: string[];
  adjudicacion?: { fecha: string; numero: string; oferentes: number; urlActa: string };
  reclamos: number;
  url: string;
}

const UNIDAD_TIEMPO: Record<string, string> = {
  "1": "horas",
  "2": "días",
  "3": "semanas",
  "4": "meses",
  "5": "años",
};

function mapDetalle(d: Json): LicitacionDetalle {
  const codigo = str(d.CodigoExterno);
  const comprador = obj(d.Comprador);
  const fechas = obj(d.Fechas);
  const pub = splitFecha(fechas.FechaPublicacion);
  const cie = splitFecha(fechas.FechaCierre ?? d.FechaCierre);

  const fechaRows: [string, unknown][] = [
    ["Publicación", fechas.FechaPublicacion],
    ["Inicio de preguntas", fechas.FechaInicio],
    ["Fin de preguntas", fechas.FechaFinal],
    ["Publicación de respuestas", fechas.FechaPubRespuestas],
    ["Visita a terreno", fechas.FechaVisitaTerreno],
    ["Cierre de ofertas", fechas.FechaCierre ?? d.FechaCierre],
    ["Apertura técnica", fechas.FechaActoAperturaTecnica],
    ["Apertura económica", fechas.FechaActoAperturaEconomica],
    ["Adjudicación", fechas.FechaAdjudicacion ?? fechas.FechaEstimadaAdjudicacion],
  ];

  const items: LicitacionItem[] = arr(obj(d.Items).Listado).map((it) => {
    const adj = obj(it.Adjudicacion);
    const proveedor = str(adj.NombreProveedor);
    return {
      correlativo: num(it.Correlativo),
      categoria: str(it.Categoria),
      producto: str(it.NombreProducto),
      descripcion: str(it.Descripcion),
      cantidad: num(it.Cantidad),
      unidad: str(it.UnidadMedida),
      adjudicacion: proveedor
        ? {
            proveedor,
            rut: str(adj.RutProveedor),
            cantidad: num(adj.Cantidad),
            montoUnitario: num(adj.MontoUnitario),
          }
        : undefined,
    };
  });

  const categorias = Array.from(
    new Set(items.map((i) => i.categoria.split("/").pop()?.trim() ?? "").filter(Boolean))
  ).slice(0, 5);

  const adj = obj(d.Adjudicacion);
  const tiempo = num(d.TiempoDuracionContrato ?? d.Tiempo);
  const unidadT = UNIDAD_TIEMPO[str(d.UnidadTiempoDuracionContrato ?? d.UnidadTiempo)] ?? "";

  return {
    codigo,
    nombre: str(d.Nombre),
    descripcion: str(d.Descripcion),
    estado: mapEstado(d.CodigoEstado, d.Estado),
    tipo: tipoDesdeCodigo(codigo, d.Tipo),
    organismo: str(comprador.NombreOrganismo) || "Organismo público",
    unidad: str(comprador.NombreUnidad),
    rutUnidad: str(comprador.RutUnidad),
    comuna: str(comprador.ComunaUnidad),
    region: normalizarRegion(comprador.RegionUnidad),
    direccion: str(comprador.DireccionUnidad),
    monto: num(d.MontoEstimado),
    moneda: str(d.Moneda) || "CLP",
    montoVisible: num(d.VisibilidadMonto) !== 0 && num(d.MontoEstimado) > 0,
    fuenteFinanciamiento: str(d.FuenteFinanciamiento),
    contrato: tiempo > 0 && unidadT ? `${tiempo} ${unidadT}` : "",
    responsable: {
      nombre: str(d.NombreResponsableContrato),
      email: str(d.EmailResponsableContrato),
      fono: str(d.FonoResponsableContrato),
    },
    fechas: fechaRows
      .map(([label, v]) => ({ label, ...splitFecha(v) }))
      .filter((f) => f.fecha),
    publicada: pub.fecha,
    cierre: cie.fecha,
    cierreHora: cie.hora,
    items,
    categorias,
    adjudicacion: str(adj.Fecha) || num(adj.NumeroOferentes)
      ? {
          fecha: splitFecha(adj.Fecha).fecha,
          numero: str(adj.Numero),
          oferentes: num(adj.NumeroOferentes),
          urlActa: str(adj.UrlActa),
        }
      : undefined,
    reclamos: num(d.CantidadReclamos),
    url: fichaUrl(codigo, "Licitación"),
  };
}

// Resumen compacto que se guarda junto al detalle (para listados rápidos).
interface Resumen {
  organismo: string;
  region: string;
  monto: number;
  moneda: string;
  publicada: string;
  cierre: string;
  cierreHora: string;
  estado: EstadoLicitacion;
  tipo: string;
  descripcion: string;
  categorias: string[];
}

function resumenDe(det: LicitacionDetalle): Resumen {
  return {
    organismo: det.organismo,
    region: det.region,
    monto: det.montoVisible ? det.monto : 0,
    moneda: det.moneda,
    publicada: det.publicada,
    cierre: det.cierre,
    cierreHora: det.cierreHora,
    estado: det.estado,
    tipo: det.tipo,
    descripcion: det.descripcion.slice(0, 700),
    categorias: det.categorias,
  };
}

async function db() {
  return import("@/lib/db");
}

// Pide el detalle a la API y lo persiste. Devuelve null si falla.
async function fetchAndStoreDetalle(
  codigo: string,
  deadline?: number
): Promise<LicitacionDetalle | null> {
  const data = await mpGet("licitaciones.json", { codigo }, { deadline, timeoutMs: 12_000 });
  const raw = arr(data?.Listado)[0];
  if (!raw) return null;
  const det = mapDetalle(raw);
  try {
    const { detalleSet } = await db();
    await detalleSet(codigo, JSON.stringify(resumenDe(det)), JSON.stringify(det));
  } catch {}
  return det;
}

/** Detalle completo de una licitación (caché 6 h en Postgres). */
export async function getLicitacionDetalle(codigo: string): Promise<LicitacionDetalle | null> {
  try {
    const { detalleGet } = await db();
    const cached = await detalleGet(codigo, 6);
    if (cached) return JSON.parse(cached) as LicitacionDetalle;
  } catch {}
  if (!TICKET) return null;
  return fetchAndStoreDetalle(codigo, Date.now() + 20_000);
}

/* ------------------------- Compra Ágil (v2) ------------------------- */

function mapEstadoCA(codigo: unknown): EstadoLicitacion {
  const c = norm(str(codigo));
  if (c.includes("cerrad")) return "Cerrada";
  if (c.includes("desiert")) return "Desierta";
  if (c.includes("adjudic") || c.includes("oc emitida")) return "Adjudicada";
  if (c.includes("cancel") || c.includes("revoc")) return "Revocada";
  return "Publicada";
}

function mapCA(it: Json): Licitacion {
  const codigo = str(it.codigo);
  const fechas = obj(it.fechas);
  const montos = obj(it.montos);
  const inst = obj(it.institucion);
  const cie = splitFecha(fechas.fecha_cierre);
  return {
    id: codigo,
    codigo,
    nombre: str(it.nombre),
    organismo: str(inst.organismo_comprador) || "Organismo público",
    region: normalizarRegion(inst.nombre_region),
    tipo: "Compra Ágil",
    monto: num(montos.monto_disponible_clp ?? montos.monto_disponible),
    moneda: "CLP",
    estado: mapEstadoCA(obj(it.estado).codigo ?? it.estado),
    publicada: splitFecha(fechas.fecha_publicacion).fecha,
    cierre: cie.fecha,
    cierreHora: cie.hora,
    score: 0,
    categoria: "Compra Ágil (hasta 100 UTM)",
    guardada: false,
    enriquecida: true,
    url: fichaUrl(codigo, "Compra Ágil"),
  };
}

async function fetchComprasAgiles(query?: string): Promise<Licitacion[]> {
  const q = query?.trim();
  const base = q
    ? `?q=${encodeURIComponent(q)}&tamano_pagina=50`
    : `?ttl_cambio_ms=172800000&tamano_pagina=50`;
  const out: Licitacion[] = [];
  for (const pagina of q ? [1] : [1, 2]) {
    const payload = await fetchCA(`${base}&numero_pagina=${pagina}`);
    const items = arr(payload?.items);
    out.push(...items.map(mapCA).filter((l) => l.codigo && l.nombre));
    if (items.length < 50) break;
  }
  const seen = new Set<string>();
  return out.filter((l) => !seen.has(l.codigo) && seen.add(l.codigo));
}

export interface CompraAgilDetalle {
  descripcion: string;
  plazoEntregaDias: number | null;
  direccionEntrega: string;
  productos: { nombre: string; descripcion: string; cantidad: number; unidad: string }[];
  documentos: { nombre: string; url: string }[];
}

export async function getCompraAgilDetalle(codigo: string): Promise<CompraAgilDetalle | null> {
  const payload = await fetchCA(`/${encodeURIComponent(codigo)}`);
  if (!payload) return null;
  const entrega = obj(payload.entrega);
  return {
    descripcion: str(payload.descripcion),
    plazoEntregaDias: entrega.plazo_entrega_dias != null ? num(entrega.plazo_entrega_dias) : null,
    direccionEntrega: str(entrega.direccion_entrega),
    productos: arr(payload.productos_solicitados).map((p) => ({
      nombre: str(p.nombre),
      descripcion: str(p.descripcion),
      cantidad: num(p.cantidad),
      unidad: str(p.unidad_medida),
    })),
    documentos: arr(payload.documentos)
      .map((d) => ({
        nombre: str(d.nombre ?? d.nombre_archivo) || "Documento",
        url: str(d.url ?? d.link),
      }))
      .filter((d) => d.url),
  };
}

/* ------------------------------ Pool ------------------------------ */
// El "pool" son todas las oportunidades vigentes (licitaciones activas +
// compras ágiles recientes), ya combinadas con los detalles en caché.

interface Pool {
  items: Licitacion[];
  ts: number;
}

const POOL_KEY = "mp_pool_v2";
const LOCK_KEY = "mp_pool_lock";

interface ListItem {
  codigo: string;
  nombre: string;
  estado: EstadoLicitacion;
  cierre: string;
  cierreHora: string;
}

async function fetchActivas(deadline: number): Promise<ListItem[] | null> {
  const data = await mpGet("licitaciones.json", { estado: "activas" }, { deadline, timeoutMs: 25_000 });
  if (!data) return null;
  return arr(data.Listado)
    .map((x) => {
      const c = splitFecha(x.FechaCierre);
      return {
        codigo: str(x.CodigoExterno),
        nombre: str(x.Nombre),
        estado: mapEstado(x.CodigoEstado, x.Estado),
        cierre: c.fecha,
        cierreHora: c.hora,
      };
    })
    .filter((x) => x.codigo && x.nombre);
}

function desdeLista(x: ListItem, r?: Resumen): Licitacion {
  return {
    id: x.codigo,
    codigo: x.codigo,
    nombre: x.nombre,
    organismo: r?.organismo || "",
    region: r?.region || "—",
    tipo: "Licitación",
    monto: r?.monto ?? 0,
    moneda: r?.moneda ?? "CLP",
    estado: r?.estado ?? x.estado,
    publicada: r?.publicada ?? "",
    cierre: r?.cierre || x.cierre,
    cierreHora: r?.cierreHora || x.cierreHora,
    score: 0,
    categoria: r?.tipo ?? tipoDesdeCodigo(x.codigo),
    guardada: false,
    descripcion: r ? [r.descripcion, ...r.categorias].filter(Boolean).join("\n") : undefined,
    enriquecida: !!r,
    url: fichaUrl(x.codigo, "Licitación"),
  };
}

// Orden en que conviene pedir detalles: primero lo que parece relevante
// para algún rubro, y dentro de eso lo que cierra más tarde (más tiempo útil).
function prioridad(x: ListItem): number {
  const t = norm(x.nombre);
  const hits = TODAS_KW.filter((k) => t.includes(k)).length;
  return hits * 10 + (x.cierre ? 1 : 0);
}

async function construirPool(budgetMs: number): Promise<Pool | null> {
  const deadline = Date.now() + budgetMs;
  const hoy = hoyChile();

  const [lista, agil] = await Promise.all([fetchActivas(deadline + 15_000), fetchComprasAgiles()]);
  if (!lista && agil.length === 0) return null;

  const vigentes = (lista ?? []).filter((x) => !x.cierre || x.cierre >= hoy);
  const { detalleResumenes } = await db();
  let resumenes = new Map<string, string>();
  try {
    resumenes = await detalleResumenes(vigentes.map((x) => x.codigo));
  } catch {}

  // Enriquecer los que faltan, dentro del presupuesto de tiempo.
  const faltantes = vigentes
    .filter((x) => !resumenes.has(x.codigo))
    .sort((a, b) => prioridad(b) - prioridad(a));
  for (const x of faltantes) {
    if (Date.now() > deadline) break;
    const det = await fetchAndStoreDetalle(x.codigo, deadline);
    if (det) resumenes.set(x.codigo, JSON.stringify(resumenDe(det)));
  }

  const lic = vigentes.map((x) => {
    const raw = resumenes.get(x.codigo);
    let r: Resumen | undefined;
    try {
      r = raw ? (JSON.parse(raw) as Resumen) : undefined;
    } catch {}
    return desdeLista(x, r);
  });

  return { items: [...lic, ...agil], ts: Date.now() };
}

async function guardarPool(pool: Pool) {
  g.__mpPool = pool;
  try {
    const { cacheSet } = await db();
    await cacheSet(POOL_KEY, JSON.stringify(pool));
  } catch {}
}

async function leerPoolDB(): Promise<Pool | null> {
  try {
    const { cacheGet } = await db();
    const raw = await cacheGet(POOL_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pool;
    return p.items?.length ? p : null;
  } catch {
    return null;
  }
}

/** Actualiza el pool (usado en segundo plano y por el cron). */
export async function refreshPool(budgetMs = REFRESH_BUDGET_MS): Promise<{ ok: boolean; total: number; enriquecidas: number }> {
  if (g.__mpRefreshing) {
    await g.__mpRefreshing;
    const p = g.__mpPool;
    return { ok: !!p, total: p?.items.length ?? 0, enriquecidas: p?.items.filter((i) => i.enriquecida).length ?? 0 };
  }
  // Candado distribuido simple (evita que varias instancias refresquen a la vez).
  try {
    const { cacheGet, cacheSet } = await db();
    const lock = Number((await cacheGet(LOCK_KEY)) || 0);
    if (Date.now() - lock < 90_000) return { ok: false, total: 0, enriquecidas: 0 };
    await cacheSet(LOCK_KEY, String(Date.now()));
  } catch {}

  let result = { ok: false, total: 0, enriquecidas: 0 };
  g.__mpRefreshing = (async () => {
    const pool = await construirPool(budgetMs);
    if (pool) {
      await guardarPool(pool);
      result = {
        ok: true,
        total: pool.items.length,
        enriquecidas: pool.items.filter((i) => i.enriquecida).length,
      };
    }
    try {
      const { cacheSet } = await db();
      await cacheSet(LOCK_KEY, "0");
    } catch {}
  })();
  try {
    await g.__mpRefreshing;
  } finally {
    g.__mpRefreshing = null;
  }
  return result;
}

function programarRefresh() {
  try {
    after(() => refreshPool().then(() => undefined));
  } catch {
    // fuera de una request (ej. scripts): refrescar sin bloquear
    void refreshPool();
  }
}

async function getPool(): Promise<Pool | null> {
  let pool = g.__mpPool ?? null;
  if (!pool || Date.now() - pool.ts > POOL_TTL_MS) {
    const fromDb = await leerPoolDB();
    if (fromDb && (!pool || fromDb.ts > pool.ts)) {
      pool = fromDb;
      g.__mpPool = fromDb;
    }
  }
  if (pool) {
    // Stale-while-revalidate: responde al tiro y actualiza después.
    if (Date.now() - pool.ts > POOL_TTL_MS) programarRefresh();
    return pool;
  }
  // Sin caché en ningún lado: primera carga bloqueante y acotada.
  const built = await construirPool(FIRST_LOAD_BUDGET_MS);
  if (built) {
    await guardarPool(built);
    programarRefresh(); // sigue enriqueciendo en segundo plano
  }
  return built;
}

/* --------------------------- API pública --------------------------- */

function puntuar(l: Licitacion, perfil: PerfilMatch): Licitacion {
  const { score, matched, enRegion } = scoreOpportunity(
    `${l.nombre} ${l.categoria} ${l.descripcion ?? ""}`,
    perfil,
    l.codigo,
    l.region
  );
  return { ...l, score, rubrosMatch: matched, enRegion };
}

// Desplaza las fechas del demo para que siempre parezcan vigentes.
function demoFor(perfil: PerfilMatch, query?: string): Licitacion[] {
  const ancla = new Date("2026-06-02T12:00:00Z").getTime();
  const hoy = new Date(hoyChile() + "T12:00:00Z").getTime();
  const shift = (iso: string) =>
    iso ? new Date(new Date(iso + "T12:00:00Z").getTime() + (hoy - ancla)).toISOString().slice(0, 10) : iso;
  const q = query ? norm(query) : "";
  return mockLicitaciones
    .map((l) => ({
      ...l,
      publicada: shift(l.publicada),
      cierre: shift(l.cierre),
      url: fichaUrl(l.codigo, l.tipo),
      enriquecida: true,
    }))
    .filter((l) => (q ? norm(`${l.nombre} ${l.organismo} ${l.categoria} ${l.codigo}`).includes(q) : true))
    .map((l) => puntuar(l, perfil))
    .sort((a, b) => b.score - a.score);
}

const pareceCodigo = (q: string) => /^\d{2,6}-\d{1,5}-[a-z0-9]{2,6}$/i.test(q.trim());

async function buscar(pool: Licitacion[], query: string): Promise<Licitacion[]> {
  const q = norm(query.trim());
  const palabras = q.split(/\s+/).filter((w) => w.length >= 2);
  const coincide = (l: Licitacion) => {
    const t = norm(`${l.nombre} ${l.codigo} ${l.organismo} ${l.descripcion ?? ""}`);
    return palabras.every((w) => t.includes(w));
  };
  const locales = pool.filter(coincide);

  const extras: Licitacion[] = [];
  // Búsqueda por código exacto: trae el detalle aunque no esté en el pool.
  if (pareceCodigo(query) && !locales.some((l) => norm(l.codigo) === q)) {
    const det = await getLicitacionDetalle(query.trim().toUpperCase());
    if (det) {
      extras.push({
        id: det.codigo,
        codigo: det.codigo,
        nombre: det.nombre,
        organismo: det.organismo,
        region: det.region,
        tipo: "Licitación",
        monto: det.montoVisible ? det.monto : 0,
        moneda: det.moneda,
        estado: det.estado,
        publicada: det.publicada,
        cierre: det.cierre,
        cierreHora: det.cierreHora,
        score: 0,
        categoria: det.tipo,
        guardada: false,
        descripcion: det.descripcion,
        enriquecida: true,
        url: det.url,
      });
    }
  }

  // Compras ágiles: la v2 tiene buscador propio (más amplio que el pool).
  const agil = await fetchComprasAgiles(query);

  // Enriquecer algunas coincidencias sin detalle (rápido, acotado).
  const deadline = Date.now() + 6_000;
  const enriquecidas: Licitacion[] = [];
  for (const l of locales) {
    if (l.tipo === "Licitación" && !l.enriquecida && Date.now() < deadline && enriquecidas.length < 8) {
      const det = await fetchAndStoreDetalle(l.codigo, deadline);
      if (det) {
        const r = resumenDe(det);
        enriquecidas.push({
          ...l,
          organismo: r.organismo,
          region: r.region,
          monto: r.monto,
          moneda: r.moneda,
          publicada: r.publicada,
          categoria: r.tipo,
          descripcion: [r.descripcion, ...r.categorias].join("\n"),
          enriquecida: true,
        });
        continue;
      }
    }
    enriquecidas.push(l);
  }

  const seen = new Set<string>();
  return [...extras, ...enriquecidas, ...agil].filter((l) => !seen.has(l.codigo) && seen.add(l.codigo));
}

/** Oportunidades para un perfil (y búsqueda opcional), ordenadas por match. */
export async function getLicitaciones(perfil: PerfilMatch, query?: string): Promise<LicitacionesResult> {
  const fetchedAt = new Date().toISOString();
  const q = query?.trim();

  if (!TICKET) {
    const items = demoFor(perfil, q);
    return {
      items,
      source: "demo",
      fetchedAt,
      total: items.length,
      totales: contarTipos(items),
      enriquecidas: items.length,
      note: "Sin ticket de API configurado: mostrando datos de demostración.",
    };
  }

  let pool: Pool | null = null;
  try {
    pool = await getPool();
  } catch {
    pool = null;
  }

  if (!pool) {
    if (q) {
      // Sin pool aún: al menos buscar en Compra Ágil.
      const agil = (await fetchComprasAgiles(q)).map((l) => puntuar(l, perfil));
      return { items: agil, source: "live", fetchedAt, total: agil.length, totales: contarTipos(agil), enriquecidas: agil.length };
    }
    const items = demoFor(perfil);
    return {
      items,
      source: "demo",
      fetchedAt,
      total: items.length,
      totales: contarTipos(items),
      enriquecidas: items.length,
      note: `No se pudo contactar la API de Mercado Público${g.__mpLastError ? ` (${g.__mpLastError})` : ""}. Mostrando datos de demostración.`,
    };
  }

  const base = q ? await buscar(pool.items, q) : pool.items;
  const puntuadas = base.map((l) => puntuar(l, perfil)).sort((a, b) => b.score - a.score);

  return {
    items: puntuadas.slice(0, MAX_ITEMS_CLIENTE),
    source: "live",
    fetchedAt: new Date(pool.ts).toISOString(),
    total: q ? puntuadas.length : pool.items.length,
    totales: contarTipos(q ? puntuadas : pool.items),
    enriquecidas: pool.items.filter((i) => i.enriquecida).length,
    note:
      !q && puntuadas.length > MAX_ITEMS_CLIENTE
        ? `Mostrando las ${MAX_ITEMS_CLIENTE} más relevantes de ${puntuadas.length.toLocaleString("es-CL")} oportunidades vigentes. Usa la búsqueda para encontrar el resto.`
        : undefined,
  };
}

/* ------------------------- Adjudicaciones ------------------------- */

export interface AdjudicacionMercado {
  codigo: string;
  nombre: string;
  organismo: string;
  region: string;
  fecha: string;
  proveedores: { nombre: string; rut: string; monto: number }[];
  montoTotal: number;
  oferentes: number;
  score: number;
  rubrosMatch: string[];
  url: string;
  urlActa?: string;
}

/** Licitaciones adjudicadas en los últimos días que calzan con el perfil. */
export async function getAdjudicacionesMercado(
  perfil: PerfilMatch,
  opts: { dias?: number; max?: number } = {}
): Promise<{ items: AdjudicacionMercado[]; source: "live" | "demo" }> {
  const { dias = 3, max = 12 } = opts;
  if (!TICKET) return { items: demoAdjudicaciones(perfil), source: "demo" };

  const hoy = hoyChile();
  const deadline = Date.now() + 18_000;
  const { cacheGet, cacheSet } = await db();

  // Listado por fecha (caché 12 h por día).
  const lista: { codigo: string; nombre: string; fecha: string }[] = [];
  for (let i = 1; i <= dias; i++) {
    const fecha = isoMenosDias(hoy, i);
    const key = `mp_adj_${fecha}`;
    let entries: { codigo: string; nombre: string }[] | null = null;
    try {
      const raw = await cacheGet(key);
      if (raw) {
        const c = JSON.parse(raw) as { ts: number; items: { codigo: string; nombre: string }[] };
        if (Date.now() - c.ts < 12 * 3600_000) entries = c.items;
      }
    } catch {}
    if (!entries) {
      const data = await mpGet("licitaciones.json", { fecha: ddmmyyyy(fecha), estado: "adjudicada" }, { deadline });
      if (data) {
        entries = arr(data.Listado)
          .map((x) => ({ codigo: str(x.CodigoExterno), nombre: str(x.Nombre) }))
          .filter((x) => x.codigo);
        try {
          await cacheSet(key, JSON.stringify({ ts: Date.now(), items: entries }));
        } catch {}
      }
    }
    (entries ?? []).forEach((e) => {
      if (!lista.some((x) => x.codigo === e.codigo)) lista.push({ ...e, fecha });
    });
  }
  if (!lista.length) return { items: [], source: "live" };

  const candidatas = lista
    .map((x) => ({ ...x, ...scoreOpportunity(x.nombre, perfil, x.codigo) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  const out: AdjudicacionMercado[] = [];
  for (const c of candidatas) {
    let det: LicitacionDetalle | null = null;
    try {
      const { detalleGet } = await db();
      const raw = await detalleGet(c.codigo, 24 * 30);
      det = raw ? (JSON.parse(raw) as LicitacionDetalle) : null;
    } catch {}
    // Si el detalle en caché es anterior a la adjudicación, se vuelve a pedir.
    if ((!det || !det.items.some((i) => i.adjudicacion)) && Date.now() < deadline) {
      det = (await fetchAndStoreDetalle(c.codigo, deadline)) ?? det;
    }
    const porProveedor = new Map<string, { nombre: string; rut: string; monto: number }>();
    det?.items.forEach((i) => {
      if (!i.adjudicacion) return;
      const k = i.adjudicacion.rut || i.adjudicacion.proveedor;
      const prev = porProveedor.get(k) ?? { nombre: i.adjudicacion.proveedor, rut: i.adjudicacion.rut, monto: 0 };
      prev.monto += i.adjudicacion.cantidad * i.adjudicacion.montoUnitario;
      porProveedor.set(k, prev);
    });
    const proveedores = Array.from(porProveedor.values()).sort((a, b) => b.monto - a.monto);
    out.push({
      codigo: c.codigo,
      nombre: det?.nombre || c.nombre,
      organismo: det?.organismo || "",
      region: det?.region || "—",
      fecha: det?.adjudicacion?.fecha || c.fecha,
      proveedores,
      montoTotal: proveedores.reduce((s, p) => s + p.monto, 0),
      oferentes: det?.adjudicacion?.oferentes ?? 0,
      score: c.score,
      rubrosMatch: c.matched,
      url: fichaUrl(c.codigo, "Licitación"),
      urlActa: det?.adjudicacion?.urlActa || undefined,
    });
  }
  return { items: out, source: "live" };
}

function demoAdjudicaciones(perfil: PerfilMatch): AdjudicacionMercado[] {
  const hoy = hoyChile();
  return mockAdjudicaciones.map((a, i) => {
    const s = scoreOpportunity(a.nombre, perfil, a.codigo);
    return {
      codigo: a.codigo,
      nombre: a.nombre,
      organismo: a.organismo,
      region: "Metropolitana",
      fecha: isoMenosDias(hoy, i + 1),
      proveedores: [{ nombre: a.proveedor === "Tu empresa" ? "Proveedor adjudicado SpA" : a.proveedor, rut: "", monto: a.monto }],
      montoTotal: a.monto,
      oferentes: 3 + (i % 4),
      score: s.score,
      rubrosMatch: s.matched,
      url: fichaUrl(a.codigo, "Licitación"),
    };
  });
}

/* ---------------------- Órdenes de compra propias ---------------------- */

export interface OrdenCompra {
  codigo: string;
  nombre: string;
  estado: string;
  organismo: string;
  fecha: string;
  total: number;
  moneda: string;
  licitacion: string;
  url: string;
}

const ESTADOS_OC: Record<number, string> = {
  4: "Enviada a proveedor",
  5: "En proceso",
  6: "Aceptada",
  9: "Cancelada",
  12: "Recepción conforme",
  13: "Pendiente de recepcionar",
  14: "Recepcionada parcialmente",
  15: "Recepción conforme incompleta",
};

// "76543210-9" / "76.543.210-9" → "76.543.210-9" (formato que pide la API).
export function formatearRut(rut: string): string {
  const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length < 2) return "";
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

/** Órdenes de compra emitidas a la empresa del usuario (por RUT). */
export async function getOrdenesProveedor(
  rut: string,
  dias = 14
): Promise<{ items: OrdenCompra[]; proveedor?: string; source: "live" | "demo"; error?: string }> {
  const rutFmt = formatearRut(rut);
  if (!rutFmt) return { items: [], source: "live", error: "Agrega el RUT de tu empresa en Configuración." };
  if (!TICKET) return { items: [], source: "demo" };

  const { cacheGet, cacheSet } = await db();
  const key = `mp_oc_${rutFmt}`;
  try {
    const raw = await cacheGet(key);
    if (raw) {
      const c = JSON.parse(raw) as { ts: number; items: OrdenCompra[]; proveedor?: string };
      if (Date.now() - c.ts < 6 * 3600_000) return { items: c.items, proveedor: c.proveedor, source: "live" };
    }
  } catch {}

  const deadline = Date.now() + 22_000;
  const emp = await mpGet("Empresas/BuscarProveedor", { rutempresaproveedor: rutFmt }, { deadline });
  const empresa = arr(emp?.listaEmpresas)[0];
  if (!empresa) {
    return {
      items: [],
      source: "live",
      error: emp ? "Ese RUT no figura como proveedor en Mercado Público." : "No se pudo consultar Mercado Público.",
    };
  }
  const codigoEmpresa = str(empresa.CodigoEmpresa);
  const proveedor = str(empresa.NombreEmpresa);

  const hoy = hoyChile();
  const codigos: { codigo: string; nombre: string; estado: number; fecha: string }[] = [];
  for (let i = 0; i < dias && Date.now() < deadline; i++) {
    const fecha = isoMenosDias(hoy, i);
    const data = await mpGet(
      "ordenesdecompra.json",
      { fecha: ddmmyyyy(fecha), CodigoProveedor: codigoEmpresa },
      { deadline, retries: 1 }
    );
    arr(data?.Listado).forEach((o) =>
      codigos.push({ codigo: str(o.Codigo), nombre: str(o.Nombre), estado: num(o.CodigoEstado), fecha })
    );
  }

  const items: OrdenCompra[] = [];
  for (const oc of codigos.slice(0, 25)) {
    let det: Json | undefined;
    if (Date.now() < deadline) {
      const data = await mpGet("ordenesdecompra.json", { codigo: oc.codigo }, { deadline, retries: 1 });
      det = arr(data?.Listado)[0];
    }
    const comprador = obj(det?.Comprador);
    items.push({
      codigo: oc.codigo,
      nombre: str(det?.Nombre) || oc.nombre,
      estado: ESTADOS_OC[num(det?.CodigoEstado ?? oc.estado)] || str(det?.Estado) || "—",
      organismo: str(comprador.NombreOrganismo),
      fecha: splitFecha(obj(det?.Fechas).FechaCreacion).fecha || oc.fecha,
      total: num(det?.Total),
      moneda: str(det?.TipoMoneda) || "CLP",
      licitacion: str(det?.CodigoLicitacion),
      url: `https://www.mercadopublico.cl/PurchaseOrder/Modules/PO/DetailsPurchaseOrder.aspx?codigoOC=${encodeURIComponent(oc.codigo)}`,
    });
  }

  try {
    await cacheSet(key, JSON.stringify({ ts: Date.now(), items, proveedor }));
  } catch {}
  return { items, proveedor, source: "live" };
}

/** Estado del conector (para el panel admin). */
export function estadoConector() {
  const p = g.__mpPool;
  return {
    ticket: !!TICKET,
    compraAgil: !!CA_TICKET,
    ultimoError: g.__mpLastError ?? null,
    poolTs: p?.ts ?? null,
    total: p?.items.length ?? 0,
    enriquecidas: p?.items.filter((i) => i.enriquecida).length ?? 0,
  };
}

/** Cifras públicas para la landing (solo lee caché; nunca llama a la API). */
export async function resumenPublico(): Promise<{ licitaciones: number; agiles: number; ts: number } | null> {
  const pool = g.__mpPool ?? (await leerPoolDB());
  if (!pool) return null;
  const t = contarTipos(pool.items);
  return { licitaciones: t["Licitación"], agiles: t["Compra Ágil"], ts: pool.ts };
}
