import "server-only";
import { getSql } from "@/lib/db";
import { fichaUrl } from "@/lib/mp-api";
import type { Licitacion, ItemLicitacion } from "@/lib/data";

// Consultas sobre el catálogo sincronizado (tabla `oportunidades`).

// Palabras clave + segmentos UNSPSC (2 primeros dígitos del código de categoría
// que Mercado Público asigna a cada producto) por rubro.
const RUBROS: Record<string, { kw: string[]; unspsc: string[] }> = {
  Tecnología: {
    kw: ["computacional", "computador", "notebook", "software", "informatic", "tecnolog", "servidor", "licencia de", "impresora", "redes", "telecomunic", "cableado", "plataforma web"],
    unspsc: ["43", "81", "45"],
  },
  "Servicios Generales": {
    kw: ["mantencion", "mantenimiento", "limpieza", "areas verdes", "jardin", "servicio de", "reparacion"],
    unspsc: ["76", "70", "72"],
  },
  Salud: {
    kw: ["medic", "clinic", "salud", "hospital", "farmac", "dental", "quirurg", "examen", "insumos clinicos", "laboratorio"],
    unspsc: ["42", "51", "41", "85"],
  },
  "Construcción y Obras": {
    kw: ["construccion", "obra", "edificacion", "vial", "pavimento", "mejoramiento", "reposicion", "conservacion", "ampliacion", "hormigon"],
    unspsc: ["72", "30", "95", "22"],
  },
  "Electricidad e Iluminación": {
    kw: ["luminaria", "led", "electric", "alumbrado", "iluminacion", "generador", "tablero"],
    unspsc: ["39", "26"],
  },
  Mobiliario: { kw: ["mobiliario", "escritorio", "silla", "estante", "mueble", "locker"], unspsc: ["56"] },
  Transporte: { kw: ["transporte", "traslado", "flete", "bus", "pasaje", "arriendo de vehiculo"], unspsc: ["78"] },
  Automotriz: { kw: ["vehicul", "automotriz", "neumatic", "repuesto", "lubricante", "camioneta"], unspsc: ["25", "15"] },
  Alimentos: { kw: ["aliment", "comida", "racion", "abarrote", "fruta", "verdura", "colacion", "cafeteria"], unspsc: ["50", "90"] },
  "Aseo e Higiene": { kw: ["aseo", "higiene", "sanitiz", "desinfec", "papel higienico", "detergente"], unspsc: ["47", "53"] },
  Seguridad: { kw: ["seguridad", "vigilancia", "guardia", "camara", "alarma", "cctv", "extintor"], unspsc: ["46", "92"] },
  Consultoría: { kw: ["consultoria", "asesoria", "estudio", "diagnostico", "capacitacion", "auditoria"], unspsc: ["80", "86", "84"] },
  "Publicidad y Marketing": { kw: ["publicidad", "marketing", "difusion", "diseno", "grafic", "impresion", "evento", "audiovisual"], unspsc: ["82", "55", "60"] },
  "Material de Oficina": { kw: ["oficina", "papeleria", "utiles", "toner", "tinta", "resma"], unspsc: ["44", "14"] },
};

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

/** Relevancia 0-100 según los rubros del usuario (palabras clave + UNSPSC). */
export function puntuar(
  texto: string,
  unspsc: string,
  rubros: string[],
  codigo: string
): { score: number; matched: string[] } {
  const t = norm(texto);
  const spread = hash(codigo) % 5;
  if (!rubros.length) return { score: 60 + spread, matched: [] };

  const matched: string[] = [];
  let mejor = 0;
  for (const r of rubros) {
    const def = RUBROS[r] ?? { kw: [norm(r)], unspsc: [] };
    const kwHits = def.kw.filter((k) => t.includes(k)).length;
    const catHit = def.unspsc.some((seg) => unspsc.includes(` ${seg} `));
    if (kwHits || catHit) {
      matched.push(r);
      mejor = Math.max(mejor, (catHit ? 2 : 0) + Math.min(kwHits, 3));
    }
  }
  if (!matched.length) return { score: 35 + spread, matched };
  const base = mejor >= 4 ? 90 : mejor >= 3 ? 86 : mejor >= 2 ? 80 : 74;
  return { score: Math.min(99, base + spread + (matched.length > 1 ? 4 : 0)), matched };
}

type Row = {
  codigo: string;
  tipo: string;
  nombre: string;
  descripcion: string;
  organismo: string;
  unidad: string;
  region: string;
  monto: string | number;
  estado: string;
  tipo_lic: string;
  publicada: string | null;
  cierre: string | null;
  categorias: string;
  unspsc: string;
  items?: string;
  detalle_at: Date | null;
};

// Mercado Público publica muchos textos EN MAYÚSCULAS: los pasamos a formato oración.
const MINUS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "para", "por", "con", "a", "al", "o"]);
function suavizar(t: string, titulo = false): string {
  const letras = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
  if (letras.length < 6 || letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length / letras.length < 0.7) return t;
  const lower = t.toLocaleLowerCase("es-CL");
  if (titulo) {
    return lower
      .split(" ")
      .map((w, i) => (i > 0 && MINUS.has(w) ? w : w.charAt(0).toLocaleUpperCase("es-CL") + w.slice(1)))
      .join(" ");
  }
  // Mayúscula en la primera letra (saltando comillas, guiones o números iniciales).
  return lower.replace(/\p{L}/u, (c) => c.toLocaleUpperCase("es-CL"));
}

// Nombres de región oficiales muy largos → forma corta usada en la app.
const REGION_CORTA: Record<string, string> = {
  "Aysén del General Carlos Ibáñez del Campo": "Aysén",
  "Magallanes y de la Antártica Chilena": "Magallanes",
  "Magallanes y de la Antártica": "Magallanes",
  "Libertador General Bernardo O'Higgins": "O'Higgins",
  "Libertador General Bernardo O´Higgins": "O'Higgins",
  "Arica y Parinacota": "Arica y Parinacota",
};
const regionCorta = (r: string) => REGION_CORTA[r] ?? r;

// Las fechas vienen como texto "YYYY-MM-DDTHH:MM" en hora de Chile (ver COLS).
const iso = (v: string | null) => v ?? "";

function toLicitacion(r: Row, rubros: string[]): Licitacion {
  const texto = `${r.nombre} ${r.categorias} ${r.descripcion.slice(0, 600)}`;
  const { score, matched } = puntuar(texto, r.unspsc, rubros, r.codigo);
  const cierre = iso(r.cierre);
  const publicada = iso(r.publicada);
  return {
    id: r.codigo,
    codigo: r.codigo,
    nombre: suavizar(r.nombre),
    organismo: r.organismo
      ? suavizar(r.organismo, true)
      : r.detalle_at
        ? "Organismo público"
        : "Cargando organismo…",
    unidad: suavizar(r.unidad, true),
    region: regionCorta(r.region) || "—",
    tipo: r.tipo === "Compra Ágil" ? "Compra Ágil" : "Licitación",
    tipoLic: r.tipo_lic,
    monto: Number(r.monto) || 0,
    estado: (["Publicada", "Cerrada", "Adjudicada", "Desierta"].includes(r.estado)
      ? r.estado
      : "Cerrada") as Licitacion["estado"],
    publicada: publicada.slice(0, 10),
    cierre: cierre.slice(0, 10),
    cierreHora: cierre,
    score,
    categoria: r.categorias.split(" | ")[0] || r.tipo,
    categorias: r.categorias ? r.categorias.split(" | ") : [],
    guardada: false,
    descripcion: suavizar(r.descripcion),
    rubrosMatch: matched,
    url: fichaUrl(r.tipo, r.codigo),
    items: r.items ? (JSON.parse(r.items) as ItemLicitacion[]) : undefined,
    enriquecida: r.tipo === "Compra Ágil" || !!r.detalle_at,
  };
}

const COLS = `codigo, tipo, nombre, descripcion, organismo, unidad, region, monto, estado, tipo_lic,
  to_char(publicada, 'YYYY-MM-DD"T"HH24:MI') AS publicada,
  to_char(cierre, 'YYYY-MM-DD"T"HH24:MI') AS cierre,
  categorias, unspsc, detalle_at`;
// "Ahora" en hora de Chile, comparable con las columnas TIMESTAMP.
const AHORA_CL = `(now() AT TIME ZONE 'America/Santiago')`;

export type Orden = "relevancia" | "cierre" | "monto" | "recientes";
export interface Filtros {
  q?: string;
  tipos?: string[];
  region?: string;
  cierre?: "hoy" | "semana" | "mes" | "";
  montoMin?: number;
  soloRubros?: boolean;
  orden?: Orden;
  pagina?: number;
  porPagina?: number;
}

export interface Busqueda {
  items: Licitacion[];
  total: number;
  pagina: number;
  paginas: number;
  totalCatalogo: number;
  regiones: string[];
}

/** Busca oportunidades abiertas con filtros; relevancia calculada por rubros. */
export async function buscarOportunidades(rubros: string[], f: Filtros): Promise<Busqueda> {
  const sql = await getSql();
  const conds: string[] = [`estado = 'Publicada'`, `cierre > ${AHORA_CL}`];
  const args: (string | number | string[])[] = [];
  const p = (v: string | number | string[]) => {
    args.push(v);
    return `$${args.length}`;
  };

  const tipos = (f.tipos ?? []).filter((t) => t === "Licitación" || t === "Compra Ágil");
  if (tipos.length) conds.push(`tipo = ANY(${p(tipos)})`);
  if (f.region) {
    const largas = Object.entries(REGION_CORTA).filter(([, c]) => c === f.region).map(([l]) => l);
    conds.push(`region = ANY(${p([f.region, ...largas])})`);
  }
  if (f.montoMin) conds.push(`monto >= ${p(f.montoMin)}`);
  if (f.cierre === "hoy") conds.push(`cierre < date_trunc('day', ${AHORA_CL}) + interval '1 day'`);
  if (f.cierre === "semana") conds.push(`cierre < ${AHORA_CL} + interval '7 days'`);
  if (f.cierre === "mes") conds.push(`cierre < ${AHORA_CL} + interval '30 days'`);
  const q = (f.q ?? "").trim();
  if (q) {
    // Cada palabra debe aparecer en nombre, organismo, categorías, descripción o código.
    for (const w of norm(q).split(/\s+/).filter(Boolean).slice(0, 6)) {
      conds.push(
        `translate(lower(codigo || ' ' || nombre || ' ' || organismo || ' ' || categorias || ' ' || descripcion),
          'áéíóúüñ', 'aeiouun') LIKE ${p(`%${w}%`)}`
      );
    }
  }

  const where = conds.join(" AND ");
  const rows = (await sql.unsafe(
    `SELECT ${COLS} FROM oportunidades WHERE ${where} LIMIT 8000`,
    args as never[]
  )) as unknown as Row[];

  let items = rows.map((r) => toLicitacion(r, rubros));
  if (f.soloRubros && rubros.length) items = items.filter((l) => (l.rubrosMatch ?? []).length > 0);

  const orden = f.orden ?? "relevancia";
  items.sort((a, b) => {
    if (orden === "cierre") return a.cierreHora!.localeCompare(b.cierreHora!);
    if (orden === "monto") return b.monto - a.monto;
    if (orden === "recientes") return (b.publicada || "").localeCompare(a.publicada || "");
    return b.score - a.score || a.cierreHora!.localeCompare(b.cierreHora!);
  });

  const porPagina = f.porPagina ?? 24;
  const paginas = Math.max(1, Math.ceil(items.length / porPagina));
  const pagina = Math.min(Math.max(1, f.pagina ?? 1), paginas);

  const [{ total }] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total FROM oportunidades
    WHERE estado = 'Publicada' AND cierre > (now() AT TIME ZONE 'America/Santiago')`;
  const regiones = (
    await sql<{ region: string }[]>`
      SELECT DISTINCT region FROM oportunidades
      WHERE estado = 'Publicada' AND region <> '' ORDER BY region`
  ).map((r) => r.region);
  const regionesCortas = [...new Set(regiones.map(regionCorta))];

  return {
    items: items.slice((pagina - 1) * porPagina, pagina * porPagina),
    total: items.length,
    pagina,
    paginas,
    totalCatalogo: total,
    regiones: regionesCortas,
  };
}

/** Detalle completo (con productos) de una oportunidad. */
export async function getOportunidad(codigo: string, rubros: string[]): Promise<Licitacion | null> {
  const sql = await getSql();
  const [r] = (await sql.unsafe(`SELECT ${COLS}, items FROM oportunidades WHERE codigo = $1`, [
    codigo,
  ])) as unknown as Row[];
  return r ? toLicitacion(r, rubros) : null;
}

/** Oportunidades por código (para refrescar las guardadas con datos actuales). */
export async function getOportunidades(codigos: string[], rubros: string[]): Promise<Licitacion[]> {
  if (!codigos.length) return [];
  const sql = await getSql();
  const rows = (await sql.unsafe(`SELECT ${COLS} FROM oportunidades WHERE codigo = ANY($1)`, [
    codigos,
  ] as never[])) as unknown as Row[];
  return rows.map((r) => toLicitacion(r, rubros));
}

export interface ResumenCatalogo {
  abiertas: number;
  licitaciones: number;
  comprasAgiles: number;
  cierranHoy: number;
  cierranSemana: number;
  nuevasHoy: number;
  montoAbierto: number;
  pendientesDetalle: number;
  ultimaActualizacion: string | null;
  porRegion: { region: string; total: number }[];
  porDia: { dia: string; total: number }[];
}

export async function resumenCatalogo(): Promise<ResumenCatalogo> {
  const sql = await getSql();
  const [r] = await sql<
    {
      abiertas: number;
      licitaciones: number;
      compras_agiles: number;
      cierran_hoy: number;
      cierran_semana: number;
      nuevas_hoy: number;
      monto: string;
      pendientes: number;
      ultima: Date | null;
    }[]
  >`
    WITH ahora AS (SELECT (now() AT TIME ZONE 'America/Santiago') AS t)
    SELECT
      COUNT(*) FILTER (WHERE estado = 'Publicada' AND cierre > t)::int AS abiertas,
      COUNT(*) FILTER (WHERE estado = 'Publicada' AND cierre > t AND tipo = 'Licitación')::int AS licitaciones,
      COUNT(*) FILTER (WHERE estado = 'Publicada' AND cierre > t AND tipo = 'Compra Ágil')::int AS compras_agiles,
      COUNT(*) FILTER (WHERE estado = 'Publicada' AND cierre > t AND cierre < date_trunc('day', t) + interval '1 day')::int AS cierran_hoy,
      COUNT(*) FILTER (WHERE estado = 'Publicada' AND cierre > t AND cierre < t + interval '7 days')::int AS cierran_semana,
      COUNT(*) FILTER (WHERE publicada >= date_trunc('day', t))::int AS nuevas_hoy,
      COALESCE(SUM(monto) FILTER (WHERE estado = 'Publicada' AND cierre > t), 0)::text AS monto,
      COUNT(*) FILTER (WHERE tipo = 'Licitación' AND estado = 'Publicada' AND detalle_at IS NULL)::int AS pendientes,
      MAX(updated_at) AS ultima
    FROM oportunidades, ahora`;
  const porRegion = await sql<{ region: string; total: number }[]>`
    SELECT region, COUNT(*)::int AS total FROM oportunidades
    WHERE estado = 'Publicada' AND cierre > (now() AT TIME ZONE 'America/Santiago') AND region <> ''
    GROUP BY region ORDER BY total DESC LIMIT 8`;
  const porDia = await sql<{ dia: string; total: number }[]>`
    SELECT to_char(date_trunc('day', publicada), 'YYYY-MM-DD') AS dia, COUNT(*)::int AS total
    FROM oportunidades
    WHERE publicada >= (now() AT TIME ZONE 'America/Santiago') - interval '14 days'
    GROUP BY 1 ORDER BY 1`;
  porRegion.forEach((x) => (x.region = regionCorta(x.region)));
  return {
    abiertas: r.abiertas,
    licitaciones: r.licitaciones,
    comprasAgiles: r.compras_agiles,
    cierranHoy: r.cierran_hoy,
    cierranSemana: r.cierran_semana,
    nuevasHoy: r.nuevas_hoy,
    montoAbierto: Number(r.monto) || 0,
    pendientesDetalle: r.pendientes,
    ultimaActualizacion: r.ultima ? new Date(r.ultima).toISOString() : null,
    porRegion,
    porDia,
  };
}
