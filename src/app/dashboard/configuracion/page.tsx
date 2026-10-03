import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/ui";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { AppearanceForm } from "@/components/dashboard/appearance-form";
import { SubscribePlans } from "@/components/dashboard/subscribe-plans";
import { currentUser } from "@/lib/current-user";
import { getPlanes } from "@/lib/db";
import { CAPACIDADES } from "@/lib/capacidades";
import { CheckCircle2, Lock } from "lucide-react";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { pago } = await searchParams;
  const pagoResultado = pago === "ok" ? "ok" : pago === "error" ? "error" : undefined;
  const planes = (await getPlanes()).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    periodo: p.periodo,
  }));

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
            keywords={user.keywords}
          />
          <AppearanceForm
            appName={user.appName}
            accent={user.accent}
            theme={user.theme}
          />
        </div>

        <div className="h-fit space-y-5 lg:sticky lg:top-24">
          <div className="card overflow-hidden">
            <div className="relative bg-brand-gradient p-5 text-white">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              <p className="text-xs font-semibold text-white/75">Tu plan actual</p>
              <p className="mt-0.5 font-display text-2xl font-bold">{user.plan}</p>
            </div>
            <ul className="space-y-2.5 p-5 text-sm">
              {CAPACIDADES.map((c) => {
                const ok = user.capacidades.includes(c.key);
                return (
                  <li key={c.key} className={`flex items-center gap-2.5 ${ok ? "text-ink" : "text-muted line-through decoration-line"}`}>
                    {ok ? (
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                    ) : (
                      <Lock size={14} className="shrink-0 text-muted" />
                    )}
                    {c.label}
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line p-4">
              <a href="#planes" className="btn-secondary w-full">
                Cambiar de plan
              </a>
            </div>
          </div>
        </div>
      </div>

      <div id="planes" className="mt-5 scroll-mt-24">
        <SubscribePlans planes={planes} currentPlan={user.plan} pagoResultado={pagoResultado} />
      </div>
    </div>
  );
}
