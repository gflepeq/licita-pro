// Catálogos para perfil de empresa (usados en onboarding y configuración).

export const RUBROS = [
  "Tecnología",
  "Servicios Generales",
  "Salud",
  "Construcción y Obras",
  "Electricidad e Iluminación",
  "Mobiliario",
  "Transporte",
  "Automotriz",
  "Alimentos",
  "Aseo e Higiene",
  "Seguridad",
  "Consultoría",
  "Publicidad y Marketing",
  "Material de Oficina",
];

export const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
];

// Normaliza el nombre de región que entrega Mercado Público
// ("Región Metropolitana de Santiago", "Región del Biobío", …) al catálogo.
const REGION_CLAVES: [string, string][] = [
  ["arica", "Arica y Parinacota"],
  ["tarapac", "Tarapacá"],
  ["antofagasta", "Antofagasta"],
  ["atacama", "Atacama"],
  ["coquimbo", "Coquimbo"],
  ["valpara", "Valparaíso"],
  ["metropolitana", "Metropolitana"],
  ["santiago", "Metropolitana"],
  ["higgins", "O'Higgins"],
  ["libertador", "O'Higgins"],
  ["maule", "Maule"],
  ["nuble", "Ñuble"],
  ["biobio", "Biobío"],
  ["bio-bio", "Biobío"],
  ["araucan", "La Araucanía"],
  ["los rios", "Los Ríos"],
  ["los lagos", "Los Lagos"],
  ["aysen", "Aysén"],
  ["aisen", "Aysén"],
  ["magallanes", "Magallanes"],
];

export function normalizarRegion(raw: unknown): string {
  const t = String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/´|'/g, "");
  if (!t.trim()) return "—";
  for (const [k, v] of REGION_CLAVES) if (t.includes(k)) return v;
  const limpio = String(raw).replace(/^Regi[oó]n\s+(del?\s+|de\s+la\s+)?/i, "").trim();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : "—";
}
