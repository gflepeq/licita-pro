import "server-only";
import { licitaciones as mockLicitaciones, type Licitacion } from "@/lib/data";

const BASE = "https://api.mercadopublico.cl/servicios/v1/publico";
const TICKET = process.env.MERCADO_PUBLICO_TICKET || "";

// API v2 de Compra Ágil (ticket en header). Reusa el mismo ticket por defecto.
const CA_BASE = process.env.COMPRA_AGIL_API_BASE || "https://api2.mercadopublico.cl";
const CA_TICKET = process.env.COMPRA_AGIL_API_TICKET || TICKET;

// Cuántos ítems enriquecer con el endpoint de detalle (llamadas secuenciales).
const LIC_ENRICH = 12;
const AGIL_MAX = 30; // la API v2 ya trae todo en el listado (sin enriquecer)
const TIME_BUDGET_MS = 20000;
const ENRICH_DELAY_MS = 300; // la API rechaza peticiones muy seguidas

export interface LicitacionesResult {
  items: Licitacion[];
  source: "live" | "demo";
  fetchedAt: string;
  note?: string;
}

// Palabras clave por rubro para el scoring semántico simple.
const RUBRO_KEYWORDS: Record<string, string[]> = {
  Tecnología: ["computacional", "notebook", "software", "informátic", "tecnolog", "servidor", "licencia", "sistema", "web", "equipo"],
  "Servicios Generales": ["aseo", "mantención", "mantenimiento", "limpieza", "áreas verdes", "jardín", "servicio"],
  Salud: ["médic", "clínic", "salud", "insumo", "hospital", "farmac", "dental", "quirúrg"],
  "Construcción y Obras": ["construcción", "obra", "edificación", "vial", "pavimento", "mejoramiento", "reposición"],
  "Electricidad e Iluminación": ["luminaria", "led", "eléctric", "alumbrado", "iluminación"],
  Mobiliario: ["mobiliario", "escritorio", "silla", "estante", "mueble"],
  Transporte: ["transporte", "traslado", "flota", "vehícul", "bus", "pasaje"],
  Automotriz: ["vehícul", "automotriz", "neumátic", "repuesto", "lubricante"],
  Alimentos: ["aliment", "comida", "ración", "abarrote", "fruta", "verdura"],
  "Aseo e Higiene": ["aseo", "higiene", "sanitiz", "desinfec", "papel"],
  Seguridad: ["seguridad", "vigilancia", "guardia", "cámara", "alarma"],
  Consultoría: ["consultoría", "asesoría", "estudio", "diagnóstico", "capacitación"],
  "Publicidad y Marketing": ["publicidad", "marketing", "difusión", "diseño", "gráfic", "impresión"],
  "Material de Oficina": ["oficina", "papelería", "útiles", "insumo", "tóner", "tinta"],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

// Calcula el "match" según los Rubros de interés del usuario.
// Devuelve el score (0-100) y los rubros que coincidieron.
export function scoreOpportunity(
  texto: string,
  rubros: string[],
  codigo: string
): { score: number; matched: string[] } {
  const t = norm(texto);
  const spread = hash(codigo) % 6; // desempate determinista dentro de la banda

  if (!rubros.length) {
    return { score: 68 + spread, matched: [] };
  }

  const matched: string[] = [];
  let maxHits = 0;
  for (const r of rubros) {
    const kws = (RUBRO_KEYWORDS[r] ?? [r]).map(norm);
    const hits = kws.filter((k) => t.includes(k)).length;
    if (hits > 0) {
      matched.push(r);
      maxHits = Math.max(maxHits, hits);
    }
  }

  let score: number;
  if (matched.length === 0) {
    score = 50 + spread; // sin coincidencia con tus rubros → bajo
  } else {
    // base por fuerza del match: varios rubros o varias palabras = mayor
    const base = matched.length >= 2 ? 92 : maxHits >= 2 ? 88 : 80;
    score = Math.min(98, base + spread);
  }
  return { score, matched };
}

function mapEstado(codigo: unknown, estado: unknown): Licitacion["estado"] {
  const c = Number(codigo);
  if (c === 6) return "Cerrada";
  if (c === 7) return "Desierta";
  if (c === 8) return "Adjudicada";
  const e = String(estado ?? "").toLowerCase();
  if (e.includes("cerrad")) return "Cerrada";
  if (e.includes("desiert")) return "Desierta";
  if (e.includes("adjudic")) return "Adjudicada";
  return "Publicada";
}

function parseFecha(s: unknown): string {
  if (!s) return "";
  const d = new Date(String(s));
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function cleanRegion(r: unknown): string {
  const raw = String(r ?? "").trim();
  if (!raw) return "—";
  const cleaned = raw.replace(/^Regi[oó]n\s+(del?\s+|de\s+la\s+|de\s+)?/i, "").trim() || raw;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Normaliza texto para búsqueda (minúsculas, sin acentos).
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

async function fetchJson(url: string, timeoutMs = 6000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return null;
    const data = await res.json();
    // La API responde { Codigo, Mensaje } ante errores/rate-limit.
    if (data && typeof data === "object" && "Mensaje" in data && !("Listado" in data))
      return null;
    return data;
  } catch {
    return null;
  }
}

// Detalle con un reintento si la API responde rate-limit/error.
async function fetchDetail(url: string): Promise<any | null> {
  let d = await fetchJson(url, 7000);
  if (!d) {
    await sleep(700);
    d = await fetchJson(url, 7000);
  }
  return d;
}

interface MpListItem {
  CodigoExterno?: string;
  Codigo?: string;
  Nombre?: string;
  CodigoEstado?: number;
  Estado?: string;
  FechaCierre?: string;
}

// ---- Enriquecimiento: licitaciones ----
async function fetchLicitaciones(deadline: number, query?: string): Promise<Licitacion[]> {
  const list = await fetchJson(`${BASE}/licitaciones.json?ticket=${TICKET}`);
  const listado: MpListItem[] = list?.Listado ?? [];
  if (!Array.isArray(listado) || listado.length === 0) return [];

  const q = query ? norm(query) : "";
  // Prioriza las que parecen abiertas (estado 5) para enriquecer primero.
  const ordered = [...listado]
    .filter((x) => x.CodigoExterno && x.Nombre)
    .filter((x) => (q ? norm(String(x.Nombre)).includes(q) : true))
    .sort((a, b) => (a.CodigoEstado === 5 ? -1 : 0) - (b.CodigoEstado === 5 ? -1 : 0));

  const out: Licitacion[] = [];
  for (let i = 0; i < ordered.length && out.length < LIC_ENRICH; i++) {
    if (Date.now() > deadline) break;
    const base = ordered[i];
    const codigo = String(base.CodigoExterno);
    let organismo = "Organismo público";
    let region = "—";
    let monto = 0;
    let cierre = parseFecha(base.FechaCierre);
    let estado = mapEstado(base.CodigoEstado, base.Estado);
    const tipo: Licitacion["tipo"] = "Licitación";
    let descripcion = "";

    const det = await fetchDetail(
      `${BASE}/licitaciones.json?codigo=${encodeURIComponent(codigo)}&ticket=${TICKET}`
    );
    const d = det?.Listado?.[0];
    if (d) {
      organismo = d.Comprador?.NombreOrganismo ?? organismo;
      region = cleanRegion(d.Comprador?.RegionUnidad);
      monto = Number(d.MontoEstimado) || 0;
      cierre = parseFecha(d.Fechas?.FechaCierre ?? d.FechaCierre) || cierre;
      estado = mapEstado(d.CodigoEstado, d.Estado);
      descripcion = String(d.Descripcion ?? "").trim();
    }

    out.push({
      id: codigo,
      codigo,
      nombre: String(base.Nombre),
      organismo,
      region,
      tipo,
      monto,
      estado,
      publicada: cierre,
      cierre,
      score: 0,
      categoria: "Licitación pública",
      guardada: false,
      descripcion,
    });
    await sleep(ENRICH_DELAY_MS);
  }
  return out;
}

// ---- API v2 de Compra Ágil (api2.mercadopublico.cl, ticket en header) ----
async function fetchCA(query: string, timeoutMs = 25000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${CA_BASE}/v2/compra-agil${query}`, {
      signal: controller.signal,
      headers: { ticket: CA_TICKET, Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.success !== "OK") return null;
    return data.payload;
  } catch {
    return null;
  }
}

function mapEstadoCA(codigo: unknown): Licitacion["estado"] {
  const c = String(codigo ?? "").toLowerCase();
  if (c.includes("cerrad")) return "Cerrada";
  if (c.includes("desiert")) return "Desierta";
  if (c.includes("adjudic")) return "Adjudicada";
  if (c.includes("cancel")) return "Cerrada";
  return "Publicada";
}

interface CAItem {
  codigo?: string;
  nombre?: string;
  estado?: { codigo?: string };
  fechas?: { fecha_publicacion?: string; fecha_cierre?: string };
  montos?: { monto_disponible_clp?: number; monto_disponible?: number };
  institucion?: { organismo_comprador?: string; nombre_region?: string };
}

function mapCA(it: CAItem): Licitacion {
  const codigo = String(it.codigo ?? "");
  return {
    id: codigo,
    codigo,
    nombre: String(it.nombre ?? "").trim(),
    organismo: it.institucion?.organismo_comprador?.trim() || "Organismo público",
    region: cleanRegion(it.institucion?.nombre_region),
    tipo: "Compra Ágil",
    monto: Number(it.montos?.monto_disponible_clp ?? it.montos?.monto_disponible) || 0,
    estado: mapEstadoCA(it.estado?.codigo),
    publicada: parseFecha(it.fechas?.fecha_publicacion),
    cierre: parseFecha(it.fechas?.fecha_cierre),
    score: 0,
    categoria: "Compra Ágil",
    guardada: false,
  };
}

// Listado de compras ágiles (búsqueda por q, o ventana de 24h por defecto).
async function fetchComprasAgilesV2(query?: string): Promise<Licitacion[]> {
  const q = query?.trim();
  const qs = q
    ? `?q=${encodeURIComponent(q)}&tamano_pagina=50&numero_pagina=1`
    : `?ttl_cambio_ms=86400000&tamano_pagina=50&numero_pagina=1`;
  const payload = await fetchCA(qs);
  const items: CAItem[] = payload?.items ?? [];
  if (!Array.isArray(items)) return [];
  return items.slice(0, AGIL_MAX).map(mapCA);
}

// Detalle de una compra ágil: términos de referencia (descripción + productos).
export interface CompraAgilDetalle {
  descripcion: string;
  plazoEntregaDias: number | null;
  direccionEntrega: string;
  productos: { nombre: string; descripcion: string; cantidad: number; unidad: string }[];
  documentos: { nombre: string; url: string }[];
}

export async function getCompraAgilDetalle(
  codigo: string
): Promise<CompraAgilDetalle | null> {
  const payload = await fetchCA(`/${encodeURIComponent(codigo)}`);
  if (!payload) return null;
  const prods = Array.isArray(payload.productos_solicitados)
    ? payload.productos_solicitados
    : [];
  const docs = Array.isArray(payload.documentos) ? payload.documentos : [];
  return {
    descripcion: String(payload.descripcion ?? "").trim(),
    plazoEntregaDias: payload.entrega?.plazo_entrega_dias ?? null,
    direccionEntrega: String(payload.entrega?.direccion_entrega ?? "").trim(),
    productos: prods.map((p: Record<string, unknown>) => ({
      nombre: String(p.nombre ?? ""),
      descripcion: String(p.descripcion ?? ""),
      cantidad: Number(p.cantidad) || 0,
      unidad: String(p.unidad_medida ?? ""),
    })),
    documentos: docs.map((d: Record<string, unknown>) => ({
      nombre: String(d.nombre ?? d.nombre_archivo ?? "Documento"),
      url: String(d.url ?? d.link ?? ""),
    })),
  };
}

// Caché en memoria del proceso: enriquecer es independiente del usuario,
// así que lo hacemos una vez cada 30 min y compartimos el resultado.
const CACHE_TTL_MS = 1800_000;
const g = globalThis as unknown as {
  __mpCache?: { items: Licitacion[]; ts: number };
  __mpInflight?: Promise<Licitacion[]> | null;
};

async function enrichAll(): Promise<Licitacion[]> {
  const deadline = Date.now() + TIME_BUDGET_MS;
  // Hosts distintos (v1 licitaciones / v2 compra ágil): se pueden paralelizar.
  const [lic, agil] = await Promise.all([
    fetchLicitaciones(deadline),
    fetchComprasAgilesV2(),
  ]);
  return [...lic, ...agil];
}

async function getRawOpportunities(): Promise<Licitacion[]> {
  if (g.__mpCache && Date.now() - g.__mpCache.ts < CACHE_TTL_MS)
    return g.__mpCache.items;
  if (g.__mpInflight) return g.__mpInflight;

  g.__mpInflight = enrichAll();
  try {
    const items = await g.__mpInflight;
    if (items.length) g.__mpCache = { items, ts: Date.now() };
    return items;
  } finally {
    g.__mpInflight = null;
  }
}

function scoreOf(l: Licitacion, rubros: string[]) {
  const { score, matched } = scoreOpportunity(
    `${l.nombre} ${l.categoria} ${l.descripcion ?? ""}`,
    rubros,
    l.codigo
  );
  return { ...l, score, rubrosMatch: matched };
}

function demoFor(rubros: string[], query?: string): Licitacion[] {
  const q = query ? norm(query) : "";
  return mockLicitaciones
    .filter((l) =>
      q ? norm(`${l.nombre} ${l.organismo} ${l.categoria}`).includes(q) : true
    )
    .map((l) => scoreOf(l, rubros))
    .sort((a, b) => b.score - a.score);
}

// Búsqueda en vivo sobre toda la lista del día (sin caché; enriquece coincidencias).
async function searchLive(query: string): Promise<Licitacion[]> {
  const deadline = Date.now() + TIME_BUDGET_MS;
  const [lic, agil] = await Promise.all([
    fetchLicitaciones(deadline, query),
    fetchComprasAgilesV2(query),
  ]);
  return [...lic, ...agil];
}

export async function getLicitaciones(
  rubros: string[],
  query?: string
): Promise<LicitacionesResult> {
  const fetchedAt = new Date().toISOString();
  const q = query?.trim();

  if (!TICKET) {
    return { items: demoFor(rubros, q), source: "demo", fetchedAt, note: "Sin ticket de API configurado." };
  }

  let raw: Licitacion[] = [];
  try {
    raw = q ? await searchLive(q) : await getRawOpportunities();
  } catch {
    raw = [];
  }

  if (raw.length === 0) {
    if (q) {
      // Búsqueda sin coincidencias: resultado vacío (no mezclar con demo).
      return { items: [], source: "live", fetchedAt, note: "Sin resultados para tu búsqueda." };
    }
    return {
      items: demoFor(rubros),
      source: "demo",
      fetchedAt,
      note: "No se pudo contactar la API de Mercado Público; mostrando datos de demostración.",
    };
  }

  const items = raw
    .map((l) => scoreOf(l, rubros))
    .sort((a, b) => b.score - a.score);

  return { items, source: "live", fetchedAt };
}
