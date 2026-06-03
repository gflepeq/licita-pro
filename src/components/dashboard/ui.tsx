import type { ElementType } from "react";
import type { EstadoLicitacion } from "@/lib/data";

/* Tarjeta de KPI */
export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  tone = "brand",
}: {
  icon: ElementType;
  label: string;
  value: string;
  delta?: string;
  tone?: "brand" | "accent" | "amber";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    accent: "bg-accent-500/10 text-accent-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={20} />
        </span>
        {delta && (
          <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-semibold text-accent-600">
            {delta}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

/* Badge de score de relevancia */
export function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 90
      ? "bg-accent-500/10 text-accent-600"
      : score >= 75
        ? "bg-brand-50 text-brand-700"
        : "bg-amber-50 text-amber-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      {score}
      <span className="font-medium opacity-70">match</span>
    </span>
  );
}

/* Badge de estado de licitación */
export function EstadoBadge({ estado }: { estado: EstadoLicitacion }) {
  const map: Record<EstadoLicitacion, string> = {
    Publicada: "bg-emerald-50 text-emerald-700",
    Cerrada: "bg-slate-100 text-slate-600",
    Adjudicada: "bg-brand-50 text-brand-700",
    Desierta: "bg-red-50 text-red-600",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${map[estado]}`}>
      {estado}
    </span>
  );
}

/* Encabezado de página del dashboard */
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
