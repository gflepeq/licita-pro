import "server-only";

// Cliente HTTP de Mercado Público compartido por la sincronización y las páginas.
// La API rechaza peticiones simultáneas del mismo ticket (Codigo 10500), incluso
// entre la v1 y la v2 de Compra Ágil, así que TODAS las llamadas pasan por una
// sola cola en serie con una pausa mínima.

export const MP_BASE = "https://api.mercadopublico.cl/servicios/v1/publico";
export const MP_TICKET = process.env.MERCADO_PUBLICO_TICKET || "";
const CA_BASE = process.env.COMPRA_AGIL_API_BASE || "https://api2.mercadopublico.cl";
const CA_TICKET = process.env.COMPRA_AGIL_API_TICKET || MP_TICKET;

const GAP_MS = 300;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Queue = { tail: Promise<unknown>; last: number };
const g = globalThis as unknown as { __mpQueues?: Record<string, Queue> };
g.__mpQueues ??= {};

// Ejecuta `fn` cuando terminen las llamadas anteriores de la misma cola.
function enqueue<T>(name: string, gapMs: number, fn: () => Promise<T>, label = ""): Promise<T> {
  const q = (g.__mpQueues![name] ??= { tail: Promise.resolve(), last: 0 });
  const run = q.tail.then(async () => {
    const wait = q.last + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    const t0 = Date.now();
    try {
      return await fn();
    } finally {
      q.last = Date.now();
      if (process.env.MP_DEBUG) console.log(`[mp-api] ${name} ${label} ${q.last - t0} ms`);
    }
  });
  q.tail = run.catch(() => undefined);
  return run;
}

export class MpRateLimit extends Error {}

/** GET a la API v1. Devuelve null ante error; lanza MpRateLimit si la API pide esperar. */
export async function mpGet<T = Record<string, unknown>>(
  path: string,
  timeoutMs = 20000
): Promise<T | null> {
  if (!MP_TICKET) return null;
  const sep = path.includes("?") ? "&" : "?";
  const url = `${MP_BASE}/${path}${sep}ticket=${MP_TICKET}`;
  return enqueue("mp", GAP_MS, async () => {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("json")) return null;
      const data = (await res.json()) as Record<string, unknown>;
      // Errores y rate-limit llegan como { Codigo, Mensaje } sin Listado.
      if (data && "Mensaje" in data && !("Listado" in data)) {
        if (Number(data.Codigo) === 10500) throw new MpRateLimit(String(data.Mensaje));
        return null;
      }
      return res.ok ? (data as T) : null;
    } catch (e) {
      if (e instanceof MpRateLimit) throw e;
      return null;
    }
  }, path.slice(0, 60));
}

/** Igual que mpGet, con reintentos ante rate-limit. */
export async function mpGetRetry<T = Record<string, unknown>>(
  path: string,
  tries = 3
): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      return await mpGet<T>(path);
    } catch (e) {
      if (!(e instanceof MpRateLimit)) return null;
      await sleep(1200 * (i + 1));
    }
  }
  return null;
}

/** GET a la API v2 de Compra Ágil (lenta: ~15-20 s por página de 50). */
export async function caGet<T = Record<string, unknown>>(
  path: string,
  timeoutMs = 90000
): Promise<T | null> {
  if (!CA_TICKET) return null;
  return enqueue("mp", GAP_MS, async () => {
    try {
      const res = await fetch(`${CA_BASE}/v2/compra-agil${path}`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { ticket: CA_TICKET, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { success?: string; payload?: T };
      return data?.success === "OK" ? (data.payload ?? null) : null;
    } catch {
      return null;
    }
  }, "ca" + path.slice(0, 60));
}

// ---------- Normalización ----------

/** Fecha de la API (hora Chile, sin zona) → "YYYY-MM-DDTHH:MM:SS" o null. */
export function mpFecha(s: unknown): string | null {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?/);
  if (m) return `${m[1]}T${m[2]}${m[3] ?? ":00"}`;
  const d = String(s).match(/^(\d{4}-\d{2}-\d{2})$/);
  return d ? `${d[1]}T00:00:00` : null;
}

export function cleanRegion(r: unknown): string {
  const raw = String(r ?? "").trim();
  if (!raw) return "";
  const cleaned =
    raw
      .replace(/^Regi[oó]n\s+(del?\s+|de\s+la\s+|de\s+)?/i, "")
      .replace(/\s+de\s+Santiago$/i, "")
      .trim() || raw;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function mapEstadoLic(codigo: unknown, estado?: unknown): string {
  const c = Number(codigo);
  if (c === 5) return "Publicada";
  if (c === 6) return "Cerrada";
  if (c === 7) return "Desierta";
  if (c === 8) return "Adjudicada";
  if (c === 18) return "Revocada";
  if (c === 19) return "Suspendida";
  const e = String(estado ?? "").toLowerCase();
  if (e.includes("public")) return "Publicada";
  if (e.includes("cerrad")) return "Cerrada";
  if (e.includes("desiert")) return "Desierta";
  if (e.includes("adjudic")) return "Adjudicada";
  return "Cerrada";
}

export function mapEstadoCA(codigo: unknown): string {
  const c = String(codigo ?? "").toLowerCase();
  if (c === "publicada") return "Publicada";
  if (c.includes("desiert")) return "Desierta";
  if (c.includes("seleccion") || c.includes("adjudic")) return "Adjudicada";
  return "Cerrada";
}

/** Ficha pública en mercadopublico.cl. */
export function fichaUrl(tipo: string, codigo: string): string {
  return tipo === "Compra Ágil"
    ? `https://buscador.mercadopublico.cl/ficha?code=${encodeURIComponent(codigo)}`
    : `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(codigo)}`;
}
