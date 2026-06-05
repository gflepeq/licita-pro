import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/ui";
import { PlanLock } from "@/components/dashboard/plan-lock";
import { AnalisisClient } from "@/components/dashboard/analisis-client";
import { currentUser } from "@/lib/current-user";

export default async function AnalisisPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  if (!user.capacidades.includes("analisis_ia")) {
    return (
      <div>
        <PageHeader
          title="Análisis de bases con IA"
          subtitle="Sube el PDF de las bases y obtén requisitos, plazos y viabilidad en segundos."
        />
        <PlanLock texto="El análisis de bases con IA está disponible en planes superiores." />
      </div>
    );
  }

  return <AnalisisClient />;
}
