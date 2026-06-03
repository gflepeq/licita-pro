import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";
import { adminStats } from "@/lib/db";
import { fmtCLP } from "@/lib/data";
import { PLANES } from "@/lib/planes";

export default async function AdminPlanes() {
  const stats = await adminStats();
  const count = (id: string) => stats.porPlan.find((p) => p.plan === id)?.total ?? 0;
  // MRR estimado: suma del precio mensual por usuario en cada plan (Trial no recurrente).
  const mrr = PLANES.filter((p) => p.id !== "Trial").reduce(
    (s, p) => s + p.precio * count(p.id),
    0
  );

  return (
    <div>
      <PageHeader
        title="Planes"
        subtitle="Planes disponibles, suscriptores e ingreso recurrente estimado."
      />

      <div className="mb-6 rounded-2xl border border-line bg-card p-5">
        <p className="text-sm text-muted">Ingreso recurrente mensual estimado (MRR)</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{fmtCLP(mrr)}</p>
        <p className="mt-1 text-xs text-muted">
          Suma de planes mensuales activos (excluye Trial).
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANES.map((p) => (
          <div key={p.id} className="rounded-2xl border border-line bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">{p.nombre}</h3>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                {count(p.id)} usuarios
              </span>
            </div>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-ink">
                {fmtCLP(p.precio)}
              </span>
              <span className="mb-1 text-sm text-muted">{p.periodo}</span>
            </div>
            <ul className="mt-5 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
