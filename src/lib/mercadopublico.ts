import "server-only";
import { licitaciones as mockLicitaciones, type Licitacion } from "@/lib/data";

const BASE = "https://api.mercadopublico.cl/servicios/v1/publico";
const TICKET = process.env.MERCADO_PUBLICO_TICKET || "";

// Cuántos ítems enriquecer con el endpoint de detalle (llamadas secuenciales).
const LIC_ENRICH = 12;
const AGIL_ENRICH = 6;
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

export function scoreFor(texto: string, rubros: string[], codigo: string): number {
  const t = texto.toLowerCase();
  let score = 58;
  if (rubros.length) {
    let matched = false;
    for (const r of rubros) {
      const kws = RUBRO_KEYWORDS[r] ?? [r.toLowerCase()];
      if (kws.some((k) => t.includes(k))) {
        matched = true;
        break;
      }
    }
    score += matched ? 26 : -4;
  } else {
    score += 8;
  }
  score += hash(codigo) % 12;
  return Math.max(50, Math.min(98, score));
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

// ---- Enriquecimiento: compras ágiles (órdenes de compra con código -AG) ----
async function fetchComprasAgiles(deadline: number, query?: string): Promise<Licitacion[]> {
  const list = await fetchJson(`${BASE}/ordenesdecompra.json?ticket=${TICKET}`);
  const listado: MpListItem[] = list?.Listado ?? [];
  if (!Array.isArray(listado) || listado.length === 0) return [];

  const q = query ? norm(query) : "";
  const agiles = listado
    .filter((x) => x.Codigo && /-AG\d+$/i.test(String(x.Codigo)) && x.Nombre)
    .filter((x) => (q ? norm(String(x.Nombre)).includes(q) : true));

  const out: Licitacion[] = [];
  for (let i = 0; i < agiles.length && out.length < AGIL_ENRICH; i++) {
    if (Date.now() > deadline) break;
    const base = agiles[i];
    const codigo = String(base.Codigo);
    // Limpia el prefijo "FI_" y el sufijo "compra ágil: ..." del nombre.
    const nombre = String(base.Nombre)
      .replace(/^FI_\s*/i, "")
      .replace(/\s*(compra ágil|orden de compra)\s*:.*$/i, "")
      .replace(/\s*orden de compra generada.*$/i, "")
      .trim();

    let organismo = "Organismo público";
    let region = "—";
    let monto = 0;
    let fecha = "";
    let descripcion = "";

    const det = await fetchDetail(
      `${BASE}/ordenesdecompra.json?codigo=${encodeURIComponent(codigo)}&ticket=${TICKET}`
    );
    const d = det?.Listado?.[0];
    if (d) {
      organismo = d.Comprador?.NombreOrganismo ?? organismo;
      region = cleanRegion(d.Comprador?.RegionUnidad);
      monto = Number(d.Total) || 0;
      fecha = parseFecha(d.Fechas?.FechaEnvio ?? d.Fechas?.FechaCreacion);
      descripcion = String(d.Descripcion ?? "").trim();
    }

    out.push({
      id: codigo,
      codigo,
      nombre,
      organismo,
      region,
      tipo: "Compra Ágil",
      monto,
      estado: "Adjudicada",
      publicada: fecha,
      cierre: fecha,
      score: 0,
      categoria: "Compra Ágil",
      guardada: false,
      descripcion,
    });
    await sleep(ENRICH_DELAY_MS);
  }
  return out;
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
  const lic = await fetchLicitaciones(deadline);
  const agil = await fetchComprasAgiles(deadline);
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

function demoFor(rubros: string[], query?: string): Licitacion[] {
  const q = query ? norm(query) : "";
  return mockLicitaciones
    .filter((l) =>
      q ? norm(`${l.nombre} ${l.organismo} ${l.categoria}`).includes(q) : true
    )
    .map((l) => ({ ...l, score: scoreFor(l.nombre + " " + l.categoria, rubros, l.codigo) }))
    .sort((a, b) => b.score - a.score);
}

// Búsqueda en vivo sobre toda la lista del día (sin caché; enriquece coincidencias).
async function searchLive(query: string): Promise<Licitacion[]> {
  const deadline = Date.now() + TIME_BUDGET_MS;
  const lic = await fetchLicitaciones(deadline, query);
  const agil = await fetchComprasAgiles(deadline, query);
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
    .map((l) => ({ ...l, score: scoreFor(l.nombre, rubros, l.codigo) }))
    .sort((a, b) => b.score - a.score);

  return { items, source: "live", fetchedAt };
}
