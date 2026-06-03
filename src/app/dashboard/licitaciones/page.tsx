import { LicitacionesClient } from "@/components/dashboard/licitaciones-client";
import { currentUser } from "@/lib/current-user";
import { getLicitaciones } from "@/lib/mercadopublico";
import { listSavedCodes } from "@/lib/db";
import { redirect } from "next/navigation";

export const maxDuration = 60;

export default async function LicitacionesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { items, source } = await getLicitaciones(user.rubros);
  const savedCodes = await listSavedCodes(user.id);

  return (
    <LicitacionesClient data={items} savedCodes={savedCodes} source={source} />
  );
}
