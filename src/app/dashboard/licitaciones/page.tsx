import { LicitacionesClient } from "@/components/dashboard/licitaciones-client";
import { currentUser } from "@/lib/current-user";
import { getLicitaciones } from "@/lib/mercadopublico";
import { listSavedCodes } from "@/lib/db";
import { redirect } from "next/navigation";

export const maxDuration = 60;

export default async function LicitacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;
  const caps = user.capacidades;
  const puedeBuscar = caps.includes("busqueda");
  const query = puedeBuscar ? (q ?? "").trim() : "";

  const { items, source, totales, enriquecidas, fetchedAt, note } = await getLicitaciones(
    { rubros: user.rubros, regiones: user.regiones, keywords: user.keywords },
    query
  );
  const savedCodes = await listSavedCodes(user.id);

  // Enforcement por plan: solo los tipos de oportunidad que incluye el plan.
  const tiposPermitidos: string[] = [];
  if (caps.includes("licitaciones")) tiposPermitidos.push("Licitación");
  if (caps.includes("compra_agil")) tiposPermitidos.push("Compra Ágil");
  const data = items.filter((l) => tiposPermitidos.includes(l.tipo));
  const total = tiposPermitidos.reduce((s, t) => s + (totales[t as keyof typeof totales] ?? 0), 0);

  return (
    <LicitacionesClient
      data={data}
      savedCodes={savedCodes}
      source={source}
      total={total}
      enriquecidas={enriquecidas}
      fetchedAt={fetchedAt}
      note={note}
      misRegiones={user.regiones}
      query={query}
      puedeRegion={caps.includes("filtro_region")}
      puedeBuscar={puedeBuscar}
      tiposPermitidos={tiposPermitidos}
    />
  );
}
