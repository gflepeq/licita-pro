import { Receipt, CheckCircle2, Wallet } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import { listPayments, paymentStats, seedPaymentsIfEmpty } from "@/lib/db";
import { fmtCLP } from "@/lib/data";

export default async function AdminPagos() {
  await seedPaymentsIfEmpty();
  const stats = await paymentStats();
  const pagos = await listPayments();

  const fecha = (iso: string) =>
    iso
      ? new Date(iso.replace(" ", "T")).toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const estadoCls: Record<string, string> = {
    pagado: "bg-accent-500/10 text-accent-600",
    pendiente: "bg-amber-50 text-amber-600",
    fallido: "bg-red-50 text-red-600",
  };

  return (
    <div>
      <PageHeader
        title="Pagos"
        subtitle="Transacciones de suscripciones. Datos ilustrativos (sin pasarela real conectada)."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Recaudación total" value={fmtCLP(stats.total)} tone="accent" />
        <StatCard icon={Receipt} label="Transacciones" value={String(stats.cantidad)} />
        <StatCard icon={CheckCircle2} label="Pagos exitosos" value={String(stats.pagados)} tone="accent" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">Historial de pagos</h2>
        </div>
        {pagos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Aún no hay pagos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pagos.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{p.usuario}</p>
                      <p className="text-xs text-muted">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{p.plan}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{fmtCLP(p.monto)}</td>
                    <td className="px-4 py-3 text-muted">{p.metodo}</td>
                    <td className="px-4 py-3 text-muted">{fecha(p.fecha)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          estadoCls[p.estado] ?? "bg-surface text-muted"
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
