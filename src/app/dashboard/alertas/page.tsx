import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/ui";
import { AlertsForm } from "@/components/dashboard/alerts-form";
import { currentUser } from "@/lib/current-user";

export default async function AlertasPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Alertas"
        subtitle="Configura cómo y cuándo quieres recibir tus oportunidades."
      />
      <AlertsForm
        correo={user.alertCorreo}
        whatsapp={user.alertWhatsapp}
        resumen={user.alertResumen}
        umbral={user.umbral}
        capacidades={user.capacidades}
      />
    </div>
  );
}
