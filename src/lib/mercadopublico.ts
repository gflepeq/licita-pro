import "server-only";
import { caGet, cleanRegion, mpFecha, mpGetRetry, MP_TICKET } from "@/lib/mp-api";

// Consultas puntuales a Mercado Público. El listado de oportunidades ya no se
// consulta en vivo: lo sincroniza src/lib/mp-sync.ts en la tabla `oportunidades`.

const TICKET = MP_TICKET;
const TIME_BUDGET_MS = 25000;
const parseFecha = (s: unknown) => (mpFecha(s) ?? "").slice(0, 10);

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = await caGet<Record<string, any>>(`/${encodeURIComponent(codigo)}`, 60000);
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

// ---- Adjudicaciones reales por RUT (Órdenes de Compra del proveedor) ----
// Una Orden de Compra aceptada/enviada es una adjudicación efectiva: el
// organismo ya te compró. La API permite filtrar el listado por RutProveedor.
export interface AdjudicacionReal {
  codigo: string; // código de la OC
  nombre: string;
  organismo: string;
  region: string;
  monto: number; // total con IVA
  fecha: string; // fecha de aceptación/envío
  estado: string;
  codigoLicitacion?: string;
}

export interface AdjudicacionesResult {
  items: AdjudicacionReal[];
  total: number; // total de OC encontradas para el RUT
  montoTotal: number; // suma de montos de las OC enriquecidas
  enriched: number; // cuántas OC traen monto
  source: "live" | "sin-rut" | "error";
  fetchedAt: string;
  note?: string;
}

// Normaliza un RUT chileno a "NNNNNNNN-DV" (sin puntos, con guion).
function normRut(rut: string): string {
  const clean = rut.replace(/\./g, "").replace(/\s/g, "").trim().toUpperCase();
  if (!clean) return "";
  if (clean.includes("-")) return clean;
  // Inserta el guion antes del dígito verificador si vino pegado.
  return clean.length > 1 ? `${clean.slice(0, -1)}-${clean.slice(-1)}` : clean;
}

const ADJ_ENRICH = 15; // OC a enriquecer con detalle (monto/organismo)
const ADJ_CACHE_TTL_MS = 6 * 3600_000; // 6 h

async function fetchAdjudicaciones(rut: string): Promise<AdjudicacionesResult> {
  const fetchedAt = new Date().toISOString();
  const list = await mpGetRetry<{ Listado?: { Codigo?: string; Nombre?: string }[]; Cantidad?: number }>(
    `ordenesdecompra.json?RutProveedor=${encodeURIComponent(rut)}`
  );
  const listado: { Codigo?: string; Nombre?: string }[] = list?.Listado ?? [];
  if (!Array.isArray(listado)) {
    return { items: [], total: 0, montoTotal: 0, enriched: 0, source: "error", fetchedAt };
  }

  const total = Number(list?.Cantidad) || listado.length;
  const deadline = Date.now() + TIME_BUDGET_MS;
  const items: AdjudicacionReal[] = [];
  let montoTotal = 0;
  let enriched = 0;

  for (let i = 0; i < listado.length && items.length < ADJ_ENRICH; i++) {
    if (Date.now() > deadline) break;
    const codigo = String(listado[i].Codigo ?? "");
    if (!codigo) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const det = await mpGetRetry<{ Listado?: Record<string, any>[] }>(
      `ordenesdecompra.json?codigo=${encodeURIComponent(codigo)}`
    );
    const d = det?.Listado?.[0];
    if (d) {
      const monto = Number(d.Total) || Number(d.TotalNeto) || 0;
      montoTotal += monto;
      enriched += 1;
      items.push({
        codigo,
        nombre: String(d.Nombre ?? listado[i].Nombre ?? "").trim(),
        organismo: d.Comprador?.NombreOrganismo?.trim() || "Organismo público",
        region: cleanRegion(d.Comprador?.RegionUnidad),
        monto,
        fecha: parseFecha(d.Fechas?.FechaAceptacion ?? d.Fechas?.FechaEnvio ?? d.Fechas?.FechaCreacion),
        estado: String(d.Estado ?? "").trim() || "—",
        codigoLicitacion: d.CodigoLicitacion ? String(d.CodigoLicitacion) : undefined,
      });
    } else {
      items.push({
        codigo,
        nombre: String(listado[i].Nombre ?? "").trim(),
        organismo: "—",
        region: "—",
        monto: 0,
        fecha: "",
        estado: "—",
      });
    }
  }

  return { items, total, montoTotal, enriched, source: "live", fetchedAt };
}

// Caché por RUT (Postgres + memoria) para evitar recargar en cada visita.
export async function getAdjudicacionesByRut(rutRaw: string): Promise<AdjudicacionesResult> {
  const fetchedAt = new Date().toISOString();
  const rut = normRut(rutRaw);

  if (!rut) {
    return {
      items: [], total: 0, montoTotal: 0, enriched: 0,
      source: "sin-rut", fetchedAt,
      note: "Agrega el RUT de tu empresa en Configuración para ver tus adjudicaciones reales.",
    };
  }
  if (!TICKET) {
    return {
      items: [], total: 0, montoTotal: 0, enriched: 0,
      source: "error", fetchedAt, note: "Sin ticket de API configurado.",
    };
  }

  const cacheKey = `adj_${rut}`;
  try {
    const { cacheGet } = await import("@/lib/db");
    const raw = await cacheGet(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { result: AdjudicacionesResult; ts: number };
      if (Date.now() - parsed.ts < ADJ_CACHE_TTL_MS) return parsed.result;
    }
  } catch {}

  let result: AdjudicacionesResult;
  try {
    result = await fetchAdjudicaciones(rut);
  } catch {
    return {
      items: [], total: 0, montoTotal: 0, enriched: 0,
      source: "error", fetchedAt,
      note: "No se pudo contactar la API de Mercado Público. Inténtalo más tarde.",
    };
  }

  if (result.source === "live" && result.total > 0) {
    try {
      const { cacheSet } = await import("@/lib/db");
      await cacheSet(cacheKey, JSON.stringify({ result, ts: Date.now() }));
    } catch {}
  }
  return result;
}
