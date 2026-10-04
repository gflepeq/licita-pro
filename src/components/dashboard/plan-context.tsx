"use client";

import { createContext, useContext } from "react";

// Capacidades del plan del usuario, disponibles en todo el dashboard.
const PlanContext = createContext<string[]>([]);

export function PlanProvider({ capacidades, children }: { capacidades: string[]; children: React.ReactNode }) {
  return <PlanContext.Provider value={capacidades}>{children}</PlanContext.Provider>;
}

/** `puede("analisis_ia")` → true si el plan del usuario la incluye. */
export function usePlan() {
  const caps = useContext(PlanContext);
  return { capacidades: caps, puede: (cap: string) => caps.includes(cap) };
}
