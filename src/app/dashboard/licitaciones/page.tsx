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
  const query = (q ?? "").trim();

  const { items, source } = await getLicitaciones(user.rubros, query);
  const savedCodes = await listSavedCodes(user.id);

  return (
    <LicitacionesClient
      data={items}
      savedCodes={savedCodes}
      source={source}
      query={query}
    />
  );
}
