import { redirect } from "next/navigation";
import { LicitacionesClient } from "@/components/dashboard/licitaciones-client";
import { currentUser } from "@/lib/current-user";
import { buscarOportunidades, type Orden } from "@/lib/oportunidades";
import { listSavedCodes } from "@/lib/db";

export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  tipo?: string;
  region?: string;
  cierre?: string;
  monto?: string;
  rubros?: string;
  orden?: string;
  p?: string;
};

export default async function LicitacionesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const caps = user.capacidades;

  // Enforcement por plan: tipos, búsqueda y filtro por región.
  const tiposPermitidos: string[] = [];
  if (caps.includes("licitaciones")) tiposPermitidos.push("Licitación");
  if (caps.includes("compra_agil")) tiposPermitidos.push("Compra Ágil");
  const puedeBuscar = caps.includes("busqueda");
  const puedeRegion = caps.includes("filtro_region");

  const tipo = tiposPermitidos.includes(sp.tipo ?? "") ? [sp.tipo!] : tiposPermitidos;
  const orden = (["relevancia", "cierre", "monto", "recientes"].includes(sp.orden ?? "")
    ? sp.orden
    : "relevancia") as Orden;
  const cierre = (["hoy", "semana", "mes"].includes(sp.cierre ?? "") ? sp.cierre : "") as
    | "hoy"
    | "semana"
    | "mes"
    | "";

  const res = tiposPermitidos.length
    ? await buscarOportunidades(user.rubros, {
        q: puedeBuscar ? sp.q : "",
        tipos: tipo,
        region: puedeRegion ? sp.region : "",
        cierre,
        montoMin: Number(sp.monto) || 0,
        soloRubros: sp.rubros === "1",
        orden,
        pagina: Number(sp.p) || 1,
      })
    : { items: [], total: 0, pagina: 1, paginas: 1, totalCatalogo: 0, regiones: [] };

  const savedCodes = await listSavedCodes(user.id);

  return (
    <LicitacionesClient
      resultado={res}
      savedCodes={savedCodes}
      filtros={{
        q: sp.q ?? "",
        tipo: sp.tipo ?? "",
        region: sp.region ?? "",
        cierre,
        monto: sp.monto ?? "",
        soloRubros: sp.rubros === "1",
        orden,
      }}
      rubros={user.rubros}
      puedeRegion={puedeRegion}
      puedeBuscar={puedeBuscar}
      tiposPermitidos={tiposPermitidos}
    />
  );
}
