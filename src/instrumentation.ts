// Arranca la sincronización con Mercado Público al iniciar el servidor (solo Node,
// y nunca durante `next build`).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.MP_SYNC === "off") return;
  const { startMpSync } = await import("@/lib/mp-sync");
  startMpSync();
}
