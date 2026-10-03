// Datos de ejemplo para el dashboard de LiciApp.
// Simulan licitaciones de Mercado Público (ChileCompra).

export type EstadoLicitacion = "Publicada" | "Cerrada" | "Adjudicada" | "Desierta";
export type TipoOportunidad = "Licitación" | "Compra Ágil";

export interface Licitacion {
  id: string;
  codigo: string; // ej. 1057-123-LE24
  nombre: string;
  organismo: string;
  region: string;
  tipo: TipoOportunidad;
  monto: number; // CLP estimado
  estado: EstadoLicitacion;
  publicada: string; // ISO date
  cierre: string; // ISO date
  score: number; // 0-100 relevancia según rubros del usuario
  categoria: string;
  guardada: boolean;
  descripcion?: string; // detalle de la licitación/compra ágil
  rubrosMatch?: string[]; // rubros del usuario con los que coincide
  garantia?: string; // tipo de garantía (pendiente: API de Compra Ágil/beta)
  cierreHora?: string; // "YYYY-MM-DDTHH:MM" hora de Chile
  unidad?: string; // unidad de compra del organismo
  tipoLic?: string; // L1, LE, LP, LQ, LR… (tipo de licitación)
  categorias?: string[]; // categorías UNSPSC de los productos
  items?: ItemLicitacion[]; // productos solicitados
  url?: string; // ficha pública en mercadopublico.cl
  enriquecida?: boolean; // false mientras se descarga el detalle
}

export interface ItemLicitacion {
  nombre: string;
  descripcion: string;
  categoria: string;
  unspsc: string;
  cantidad: number;
  unidad: string;
}

export const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);

/** Monto abreviado: $850 mil, $12,4 MM, $1.250 MM. */
export const fmtCLPCorto = (n: number) => {
  if (n >= 1e9) return `$${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(n / 1e6)} MM`;
  if (n >= 1e6) return `$${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(n / 1e6)} MM`;
  if (n >= 1e3) return `$${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(n / 1e3)} mil`;
  return fmtCLP(n);
};

export const fmtFecha = (iso: string) =>
  new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// "Hoy" en Chile como YYYY-MM-DD (independiente de la zona del servidor/navegador).
export const hoyChile = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());

/** Días calendario entre hoy (Chile) y la fecha (YYYY-MM-DD…). */
export const diasRestantes = (iso: string) => {
  const hoy = new Date(hoyChile() + "T00:00:00Z");
  const fin = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return Math.round((fin.getTime() - hoy.getTime()) / 86400000);
};

/** "Cierra hoy 15:00", "Cierra mañana", "Cierra en 5 días", "Cerrada". */
export function textoCierre(cierreHora: string | undefined, cierre: string): string {
  if (!cierre) return "Sin fecha de cierre";
  const d = diasRestantes(cierre);
  const hora = cierreHora && cierreHora.length >= 16 ? cierreHora.slice(11, 16) : "";
  if (d < 0) return "Cerrada";
  if (d === 0) return hora ? `Cierra hoy ${hora}` : "Cierra hoy";
  if (d === 1) return hora ? `Cierra mañana ${hora}` : "Cierra mañana";
  return `Cierra en ${d} días`;
}

export const licitaciones: Licitacion[] = [
  {
    id: "1",
    codigo: "1057-412-LR26",
    nombre: "Suministro e instalación de luminarias LED para alumbrado público comunal",
    organismo: "Municipalidad de Maipú",
    region: "Metropolitana",
    tipo: "Licitación",
    monto: 184500000,
    estado: "Publicada",
    publicada: "2026-05-28",
    cierre: "2026-06-12",
    score: 96,
    categoria: "Electricidad e Iluminación",
    guardada: true,
  },
  {
    id: "2",
    codigo: "2398-77-COT26",
    nombre: "Adquisición de equipos computacionales y notebooks para oficinas",
    organismo: "Servicio de Impuestos Internos",
    region: "Metropolitana",
    tipo: "Compra Ágil",
    monto: 23900000,
    estado: "Publicada",
    publicada: "2026-05-31",
    cierre: "2026-06-05",
    score: 91,
    categoria: "Tecnología",
    guardada: true,
  },
  {
    id: "3",
    codigo: "1044-318-LP26",
    nombre: "Servicio de aseo y mantención de áreas verdes municipales",
    organismo: "Municipalidad de Valparaíso",
    region: "Valparaíso",
    tipo: "Licitación",
    monto: 312000000,
    estado: "Publicada",
    publicada: "2026-05-26",
    cierre: "2026-06-18",
    score: 88,
    categoria: "Servicios Generales",
    guardada: false,
  },
  {
    id: "4",
    codigo: "750-201-LE26",
    nombre: "Provisión de insumos médicos y material clínico desechable",
    organismo: "Servicio de Salud Metropolitano Sur",
    region: "Metropolitana",
    tipo: "Licitación",
    monto: 96700000,
    estado: "Publicada",
    publicada: "2026-05-30",
    cierre: "2026-06-09",
    score: 84,
    categoria: "Salud",
    guardada: false,
  },
  {
    id: "5",
    codigo: "3211-15-COT26",
    nombre: "Mobiliario de oficina ergonómico para nuevas dependencias",
    organismo: "Ministerio de Desarrollo Social",
    region: "Metropolitana",
    tipo: "Compra Ágil",
    monto: 8450000,
    estado: "Publicada",
    publicada: "2026-06-01",
    cierre: "2026-06-06",
    score: 79,
    categoria: "Mobiliario",
    guardada: false,
  },
  {
    id: "6",
    codigo: "1180-540-LP26",
    nombre: "Construcción de ciclovía y obras de mejoramiento vial sector centro",
    organismo: "Gobierno Regional del Biobío",
    region: "Biobío",
    tipo: "Licitación",
    monto: 1240000000,
    estado: "Publicada",
    publicada: "2026-05-22",
    cierre: "2026-06-25",
    score: 73,
    categoria: "Construcción y Obras",
    guardada: false,
  },
  {
    id: "7",
    codigo: "905-88-LE26",
    nombre: "Servicio de transporte escolar rural temporada 2026",
    organismo: "Municipalidad de Temuco",
    region: "La Araucanía",
    tipo: "Licitación",
    monto: 145000000,
    estado: "Cerrada",
    publicada: "2026-05-10",
    cierre: "2026-05-30",
    score: 68,
    categoria: "Transporte",
    guardada: false,
  },
  {
    id: "8",
    codigo: "2102-33-COT26",
    nombre: "Suministro de artículos de aseo e higiene institucional",
    organismo: "Junta Nacional de Jardines Infantiles",
    region: "Metropolitana",
    tipo: "Compra Ágil",
    monto: 5980000,
    estado: "Publicada",
    publicada: "2026-06-01",
    cierre: "2026-06-04",
    score: 64,
    categoria: "Servicios Generales",
    guardada: false,
  },
  {
    id: "9",
    codigo: "1320-209-LR26",
    nombre: "Servicio de mantención preventiva de flota de vehículos fiscales",
    organismo: "Carabineros de Chile",
    region: "Metropolitana",
    tipo: "Licitación",
    monto: 67800000,
    estado: "Adjudicada",
    publicada: "2026-04-18",
    cierre: "2026-05-12",
    score: 61,
    categoria: "Automotriz",
    guardada: false,
  },
  {
    id: "10",
    codigo: "640-120-LE26",
    nombre: "Desarrollo de plataforma web y mantención de sistemas informáticos",
    organismo: "Subsecretaría de Telecomunicaciones",
    region: "Metropolitana",
    tipo: "Licitación",
    monto: 158000000,
    estado: "Publicada",
    publicada: "2026-05-29",
    cierre: "2026-06-20",
    score: 58,
    categoria: "Tecnología",
    guardada: false,
  },
];

// ----- Adjudicaciones seguidas -----
export interface Adjudicacion {
  id: string;
  codigo: string;
  nombre: string;
  organismo: string;
  proveedor: string;
  monto: number;
  fecha: string;
  ganada: boolean; // si el cliente fue el adjudicado
}

export const adjudicaciones: Adjudicacion[] = [
  {
    id: "a1",
    codigo: "1319-208-LE26",
    nombre: "Suministro de uniformes institucionales",
    organismo: "Municipalidad de Ñuñoa",
    proveedor: "Tu empresa",
    monto: 42300000,
    fecha: "2026-05-29",
    ganada: true,
  },
  {
    id: "a2",
    codigo: "1320-209-LR26",
    nombre: "Mantención preventiva de flota de vehículos fiscales",
    organismo: "Carabineros de Chile",
    proveedor: "Servicios Automotrices del Sur SpA",
    monto: 67800000,
    fecha: "2026-05-26",
    ganada: false,
  },
  {
    id: "a3",
    codigo: "905-88-LE26",
    nombre: "Transporte escolar rural temporada 2026",
    organismo: "Municipalidad de Temuco",
    proveedor: "Transportes Andinos Ltda.",
    monto: 145000000,
    fecha: "2026-05-31",
    ganada: false,
  },
  {
    id: "a4",
    codigo: "2044-71-COT26",
    nombre: "Adquisición de equipamiento audiovisual",
    organismo: "Universidad de Chile",
    proveedor: "Tu empresa",
    monto: 18700000,
    fecha: "2026-05-21",
    ganada: true,
  },
];

// ----- KPIs / serie temporal del dashboard -----
export const stats = {
  oportunidadesNuevas: 47,
  oportunidadesNuevasDelta: 12,
  relevantes: 18,
  relevantesDelta: 4,
  guardadas: licitaciones.filter((l) => l.guardada).length,
  cierranPronto: licitaciones.filter(
    (l) => l.estado === "Publicada" && diasRestantes(l.cierre) <= 5
  ).length,
  tasaExito: 31, // %
  montoAdjudicado: adjudicaciones
    .filter((a) => a.ganada)
    .reduce((s, a) => s + a.monto, 0),
};

export const serieDeteccion = [
  { mes: "Dic", detectadas: 210, relevantes: 38 },
  { mes: "Ene", detectadas: 245, relevantes: 44 },
  { mes: "Feb", detectadas: 198, relevantes: 41 },
  { mes: "Mar", detectadas: 276, relevantes: 52 },
  { mes: "Abr", detectadas: 312, relevantes: 61 },
  { mes: "May", detectadas: 298, relevantes: 67 },
];

export const distribucionCategoria = [
  { categoria: "Tecnología", valor: 28 },
  { categoria: "Servicios", valor: 23 },
  { categoria: "Salud", valor: 17 },
  { categoria: "Construcción", valor: 14 },
  { categoria: "Otros", valor: 18 },
];

export const usuario = {
  nombre: "Camila Rojas",
  empresa: "Innova Suministros SpA",
  email: "camila@innovasuministros.cl",
  plan: "Plan Gana",
  iniciales: "CR",
};
