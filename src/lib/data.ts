// Tipos, formateadores y datos de ejemplo (modo demo, sin ticket de API).

export type EstadoLicitacion = "Publicada" | "Cerrada" | "Adjudicada" | "Desierta" | "Revocada" | "Suspendida";
export type TipoOportunidad = "Licitación" | "Compra Ágil";

export interface Licitacion {
  id: string;
  codigo: string; // ej. 1057-123-LE24
  nombre: string;
  organismo: string;
  region: string;
  tipo: TipoOportunidad;
  monto: number; // monto estimado (en `moneda`, CLP por defecto)
  moneda?: string; // CLP | CLF (UF) | USD | UTM
  estado: EstadoLicitacion;
  publicada: string; // ISO date (YYYY-MM-DD)
  cierre: string; // ISO date (YYYY-MM-DD)
  cierreHora?: string; // HH:MM (hora de Chile)
  score: number; // 0-100 relevancia según rubros del usuario
  categoria: string; // tipo/modalidad legible (ej. "Licitación Pública 100–1.000 UTM")
  guardada: boolean;
  descripcion?: string; // detalle de la licitación/compra ágil
  rubrosMatch?: string[]; // rubros del usuario con los que coincide
  enRegion?: boolean; // la región coincide con las regiones del usuario
  garantia?: string;
  enriquecida?: boolean; // true si ya se obtuvo el detalle desde la API
  url?: string; // ficha oficial en Mercado Público
}

export const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);

// Formato compacto: $2.233 M · $23,9 M · $950 mil
export const fmtCLPCorto = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: n >= 100_000_000 ? 0 : 1 })} M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString("es-CL")} mil`;
  return fmtCLP(n);
};

// Monto con su moneda original (las licitaciones pueden venir en UF/USD/UTM).
export const fmtMonto = (monto: number, moneda = "CLP") => {
  if (!monto || monto <= 0) return "No publicado";
  const m = moneda.toUpperCase();
  if (m === "CLP" || !m) return fmtCLP(monto);
  const n = monto.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  if (m === "CLF" || m === "UF") return `UF ${n}`;
  if (m === "USD") return `US$ ${n}`;
  if (m === "EUR") return `€ ${n}`;
  return `${m} ${n}`;
};

export const fmtFecha = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10) + "T12:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
};

// Fecha de hoy en Chile (YYYY-MM-DD), independiente de la zona del servidor.
export const hoyChile = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// Días que faltan para una fecha ISO (0 = hoy, negativo = ya pasó).
export const diasRestantes = (iso: string) => {
  const hoy = new Date(hoyChile() + "T00:00:00Z");
  const fin = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return Math.round((fin.getTime() - hoy.getTime()) / 86400000);
};

export const textoCierre = (iso: string, hora?: string) => {
  if (!iso) return "";
  const d = diasRestantes(iso);
  if (d < 0) return `Cerró ${fmtFecha(iso)}`;
  if (d === 0) return `Cierra hoy${hora ? ` ${hora}` : ""}`;
  if (d === 1) return `Cierra mañana${hora ? ` ${hora}` : ""}`;
  return `Cierra en ${d} días`;
};

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
