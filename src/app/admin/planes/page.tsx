import { PageHeader } from "@/components/dashboard/ui";
import { PlansAdmin } from "@/components/admin/plans-admin";
import { adminStats, getPlanes } from "@/lib/db";
import { fmtCLP } from "@/lib/data";
import { CAPACIDADES } from "@/lib/capacidades";

export default async function AdminPlanes() {
  const [planes, stats] = await Promise.all([getPlanes({ all: true }), adminStats()]);

  const counts: Record<string, number> = {};
  stats.porPlan.forEach((p) => (counts[p.plan] = p.total));

  // MRR estimado: planes recurrentes (precio > 0 y periodo distinto de Trial).
  const mrr = planes
    .filter((p) => p.activo && p.precio > 0 && !/d[ií]as/i.test(p.periodo))
    .reduce((s, p) => s + p.precio * (counts[p.id] ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Planes"
        subtitle="Crea, edita o elimina planes. Las capacidades coinciden con los filtros y opciones reales de la app."
      />

      <div className="mb-6 rounded-2xl border border-line bg-card p-5">
        <p className="text-sm text-muted">Ingreso recurrente mensual estimado (MRR)</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{fmtCLP(mrr)}</p>
        <p className="mt-1 text-xs text-muted">Suma de planes mensuales activos por sus suscriptores.</p>
      </div>

      <PlansAdmin planes={planes} counts={counts} capacidades={CAPACIDADES} />
    </div>
  );
}
