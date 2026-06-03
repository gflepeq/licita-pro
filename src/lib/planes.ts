// Definición de planes (coincide con la landing).
export interface Plan {
  id: string;
  nombre: string;
  precio: number; // CLP / mes (Trial: por 7 días)
  periodo: string;
  features: string[];
}

export const PLANES: Plan[] = [
  {
    id: "Trial",
    nombre: "Trial",
    precio: 4990,
    periodo: "por 7 días",
    features: ["Detección con IA", "Análisis de bases", "Alertas por correo"],
  },
  {
    id: "Plan Detecta",
    nombre: "Plan Detecta",
    precio: 14990,
    periodo: "/mes",
    features: ["Compras Ágiles", "Alertas diarias", "50 oportunidades guardadas"],
  },
  {
    id: "Plan Gana",
    nombre: "Plan Gana",
    precio: 34990,
    periodo: "/mes",
    features: [
      "Licitaciones + Compras Ágiles",
      "Análisis IA ilimitado",
      "Alertas por WhatsApp",
      "Soporte prioritario",
    ],
  },
];

export const PLAN_IDS = PLANES.map((p) => p.id);
