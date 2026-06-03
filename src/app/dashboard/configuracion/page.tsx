import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/ui";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { AppearanceForm } from "@/components/dashboard/appearance-form";
import { currentUser } from "@/lib/current-user";

export default async function ConfiguracionPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Tu perfil de empresa entrena al motor de IA para detectar mejores oportunidades."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <ProfileForm
            nombre={user.nombre}
            empresa={user.empresa}
            rut={user.rut}
            email={user.email}
            rubros={user.rubros}
            regiones={user.regiones}
          />
          <AppearanceForm
            appName={user.appName}
            accent={user.accent}
            theme={user.theme}
          />
        </div>

        <div className="h-fit rounded-2xl border border-line bg-card p-5">
          <h2 className="font-semibold text-ink">Tu plan</h2>
          <div className="mt-3 rounded-xl bg-brand-50 p-4 dark:bg-brand-950/40">
            <p className="text-lg font-bold text-brand-700 dark:text-brand-300">
              {user.plan}
            </p>
            <p className="mt-1 text-sm text-muted">
              Acceso a detección y análisis con IA.
            </p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>· Detección ilimitada con IA</li>
            <li>· Análisis de bases ilimitado</li>
            <li>· Alertas por WhatsApp</li>
            <li>· Soporte prioritario</li>
          </ul>
          <button className="mt-4 w-full rounded-lg border border-line py-2.5 text-sm font-semibold text-ink hover:bg-surface">
            Cambiar de plan
          </button>
        </div>
      </div>
    </div>
  );
}
