// Capacidades de un plan. Cada una corresponde a un filtro/opción REAL que el
// usuario tiene en la app (mecanismos de compra, alertas, análisis IA, etc.).
// Los planes se arman eligiendo de esta lista → quedan en concordancia con la app.

export interface Capacidad {
  key: string;
  label: string;
  grupo: string;
}

export const CAPACIDADES: Capacidad[] = [
  { key: "licitaciones", label: "Acceso a Licitaciones", grupo: "Oportunidades" },
  { key: "compra_agil", label: "Acceso a Compras Ágiles", grupo: "Oportunidades" },
  { key: "filtro_region", label: "Filtro por región", grupo: "Filtros" },
  { key: "busqueda", label: "Búsqueda en Mercado Público", grupo: "Filtros" },
  { key: "alertas_correo", label: "Alertas por correo", grupo: "Alertas" },
  { key: "alertas_whatsapp", label: "Alertas por WhatsApp", grupo: "Alertas" },
  { key: "resumen_semanal", label: "Resumen semanal de adjudicaciones", grupo: "Alertas" },
  { key: "analisis_ia", label: "Análisis de bases con IA", grupo: "IA" },
  { key: "guardadas_ilimitadas", label: "Oportunidades guardadas ilimitadas", grupo: "Cuenta" },
  { key: "soporte_prioritario", label: "Soporte prioritario", grupo: "Cuenta" },
];

export const capacidadLabel = (key: string): string =>
  CAPACIDADES.find((c) => c.key === key)?.label ?? key;
