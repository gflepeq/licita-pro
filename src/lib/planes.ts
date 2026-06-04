// Definición por defecto de planes (semilla de la tabla `plans`).
// `features` son claves de capacidades (ver src/lib/capacidades.ts).
export interface Plan {
  id: string; // clave estable (también el valor guardado en users.plan)
  nombre: string;
  precio: number; // CLP/mes (Trial: por 7 días)
  periodo: string;
  features: string[]; // claves de capacidades
  destacado: boolean;
  activo: boolean;
  orden: number;
}

export const PLANES_SEED: Plan[] = [
  {
    id: "Trial",
    nombre: "Trial",
    precio: 4990,
    periodo: "por 7 días",
    features: ["compra_agil", "busqueda", "alertas_correo", "analisis_ia"],
    destacado: false,
    activo: true,
    orden: 1,
  },
  {
    id: "Plan Detecta",
    nombre: "Plan Detecta",
    precio: 14990,
    periodo: "/mes",
    features: ["compra_agil", "busqueda", "filtro_region", "alertas_correo", "resumen_semanal"],
    destacado: false,
    activo: true,
    orden: 2,
  },
  {
    id: "Plan Gana",
    nombre: "Plan Gana",
    precio: 34990,
    periodo: "/mes",
    features: [
      "licitaciones",
      "compra_agil",
      "busqueda",
      "filtro_region",
      "alertas_correo",
      "alertas_whatsapp",
      "resumen_semanal",
      "analisis_ia",
      "guardadas_ilimitadas",
      "soporte_prioritario",
    ],
    destacado: true,
    activo: true,
    orden: 3,
  },
];
