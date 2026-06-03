import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/ui";
import { OportunidadesClient } from "@/components/dashboard/oportunidades-client";
import { currentUser } from "@/lib/current-user";
import { listSaved } from "@/lib/db";
import type { Licitacion } from "@/lib/data";

export default async function OportunidadesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const guardadas = (await listSaved(user.id)) as Licitacion[];

  return (
    <div>
      <PageHeader
        title="Oportunidades guardadas"
        subtitle="Las licitaciones que marcaste para hacer seguimiento."
      />
      <OportunidadesClient items={guardadas} />
    </div>
  );
}
