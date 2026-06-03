import { Trophy, XCircle } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import { adjudicaciones, fmtCLP, fmtFecha, stats } from "@/lib/data";
import { CheckCircle2, Percent } from "lucide-react";

export default function AdjudicacionesPage() {
  const ganadas = adjudicaciones.filter((a) => a.ganada).length;

  return (
    <div>
      <PageHeader
        title="Adjudicaciones"
        subtitle="Resultados de las licitaciones y cotizaciones que seguiste."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Trophy}
          label="Licitaciones ganadas"
          value={String(ganadas)}
          tone="accent"
        />
        <StatCard
          icon={Percent}
          label="Tasa de éxito"
          value={`${stats.tasaExito}%`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Monto adjudicado"
          value={fmtCLP(stats.montoAdjudicado)}
          tone="accent"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">Resumen de adjudicaciones</h2>
        </div>
        <ul className="divide-y divide-line">
          {adjudicaciones.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    a.ganada
                      ? "bg-accent-500/10 text-accent-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {a.ganada ? <Trophy size={18} /> : <XCircle size={18} />}
                </span>
                <div>
                  <p className="font-medium text-ink">{a.nombre}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {a.organismo} · {a.codigo}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Adjudicado a <span className="font-medium text-ink">{a.proveedor}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 pl-13 sm:pl-0">
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">{fmtCLP(a.monto)}</p>
                  <p className="text-xs text-muted">{fmtFecha(a.fecha)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    a.ganada
                      ? "bg-accent-500/10 text-accent-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {a.ganada ? "Ganada" : "No adjudicada"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
