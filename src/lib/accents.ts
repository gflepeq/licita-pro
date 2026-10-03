// Paletas de acento seleccionables (ajustes de marca).
export const ACCENTS: Record<string, { label: string; c600: string; c700: string }> = {
  blue: { label: "Azul", c600: "#2b60ec", c700: "#1f4fd1" },
  emerald: { label: "Esmeralda", c600: "#059669", c700: "#047857" },
  violet: { label: "Violeta", c600: "#773cec", c700: "#6328d6" },
  rose: { label: "Rosa", c600: "#e11d48", c700: "#be123c" },
  amber: { label: "Ámbar", c600: "#d97706", c700: "#b45309" },
  cyan: { label: "Cian", c600: "#0891b2", c700: "#0e7490" },
};

export const DEFAULT_ACCENT = "blue";

export function accentVars(accent: string): string {
  const a = ACCENTS[accent] ?? ACCENTS[DEFAULT_ACCENT];
  return `--brand-600:${a.c600};--brand-700:${a.c700};`;
}
