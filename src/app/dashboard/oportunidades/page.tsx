import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/ui";
import { OportunidadesClient } from "@/components/dashboard/oportunidades-client";
import { currentUser } from "@/lib/current-user";
import { listSaved } from "@/lib/db";
import { getOportunidades } from "@/lib/oportunidades";
import type { Licitacion } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OportunidadesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  // La copia guardada se refresca con el estado actual del catálogo (cierres, montos, estado).
  const guardadas = (await listSaved(user.id)) as Licitacion[];
  const actuales = new Map(
    (await getOportunidades(guardadas.map((g) => g.codigo), user.rubros)).map((l) => [l.codigo, l])
  );
  const items = guardadas.map((g) => actuales.get(g.codigo) ?? g);

  return (
    <div>
      <PageHeader
        title="Oportunidades guardadas"
        subtitle="Las licitaciones y compras ágiles que sigues, con su estado actualizado."
      />
      <OportunidadesClient items={items} />
    </div>
  );
}
