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

  const { items, source } = await getLicitaciones(user.rubros, query);
  const savedCodes = await listSavedCodes(user.id);

  // Enforcement por plan: solo los tipos de oportunidad que incluye el plan.
  const tiposPermitidos: string[] = [];
  if (caps.includes("licitaciones")) tiposPermitidos.push("Licitación");
  if (caps.includes("compra_agil")) tiposPermitidos.push("Compra Ágil");
  const data = items.filter((l) => tiposPermitidos.includes(l.tipo));

  return (
    <LicitacionesClient
      data={data}
      savedCodes={savedCodes}
      source={source}
      query={query}
      puedeRegion={caps.includes("filtro_region")}
      puedeBuscar={puedeBuscar}
      tiposPermitidos={tiposPermitidos}
    />
  );
}
