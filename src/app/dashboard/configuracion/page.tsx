import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/ui";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { AppearanceForm } from "@/components/dashboard/appearance-form";
import { SubscribePlans } from "@/components/dashboard/subscribe-plans";
import { currentUser } from "@/lib/current-user";
import { getPlanes, listSavedCodes } from "@/lib/db";
import { CAPACIDADES, LIMITE_GUARDADAS } from "@/lib/capacidades";
import { Check, Lock } from "lucide-react";
import Link from "next/link";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { pago } = await searchParams;
  const pagoResultado = pago === "ok" ? "ok" : pago === "error" ? "error" : undefined;
  const todos = await getPlanes();
  const planes = todos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    precio: p.precio,
    periodo: p.periodo,
    features: p.features,
    destacado: p.destacado,
  }));
  const planActual = todos.find((p) => p.id === user.plan);
  const guardadas = (await listSavedCodes(user.id)).length;
  const ilimitadas = user.capacidades.includes("guardadas_ilimitadas");

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
            accent={user.accent}
            theme={user.theme}
          />
        </div>

        <div className="card h-fit p-5">
          <h2 className="font-semibold text-ink">Tu plan</h2>
          <div className="bg-flow mt-3 rounded-xl p-4 text-white">
            <p className="text-lg font-semibold">{planActual?.nombre ?? user.plan}</p>
            {planActual && (
              <p className="mt-0.5 text-sm text-white/85">
                ${planActual.precio.toLocaleString("es-CL")} {planActual.periodo}
              </p>
            )}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {CAPACIDADES.map((c) => {
              const ok = user.capacidades.includes(c.key);
              return (
                <li key={c.key} className={`flex items-start gap-2 ${ok ? "text-ink/85" : "text-muted"}`}>
                  {ok ? (
                    <Check size={15} className="mt-0.5 shrink-0 text-accent-600" />
                  ) : (
                    <Lock size={14} className="mt-0.5 shrink-0" />
                  )}
                  {c.label}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
            Oportunidades guardadas:{" "}
            <span className="num font-semibold text-ink">
              {guardadas}
              {ilimitadas ? "" : ` de ${LIMITE_GUARDADAS}`}
            </span>
          </p>
          {user.capacidades.length < CAPACIDADES.length && (
            <Link
              href="#planes"
              className="mt-3 block rounded-lg btn-ink px-3 py-2 text-center text-xs font-semibold"
            >
              Ver planes con más funciones
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5">
        <SubscribePlans planes={planes} currentPlan={user.plan} pagoResultado={pagoResultado} />
      </div>
    </div>
  );
}
