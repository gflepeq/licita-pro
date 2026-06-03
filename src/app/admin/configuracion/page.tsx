import { PageHeader } from "@/components/dashboard/ui";
import { ConfigForm } from "@/components/admin/config-form";
import { getConfig } from "@/lib/db";

export default async function AdminConfig() {
  const config = await getConfig();
  return (
    <div>
      <PageHeader
        title="Configuración general"
        subtitle="Ajustes globales de la plataforma."
      />
      <ConfigForm config={config} />
    </div>
  );
}
