import type { ElementType, ReactNode } from "react";
import { Clock, Zap, FileText } from "lucide-react";
import { diasRestantes, textoCierre, type EstadoLicitacion } from "@/lib/data";

/* Tarjeta de KPI */
export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  tone = "brand",
}: {
  icon: ElementType;
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  tone?: "brand" | "accent" | "amber" | "violet";
}) {
  const tones = {
    brand: "bg-brand-600/10 text-brand-600 ring-brand-600/15",
    accent: "bg-accent-500/10 text-accent-600 ring-accent-500/20",
    amber: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
    violet: "bg-violet-500/10 text-violet-600 ring-violet-500/20",
  };
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${tones[tone]}`}>
          <Icon size={19} />
        </span>
        {delta && (
          <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-semibold text-accent-600">
            {delta}
          </span>
        )}
      </div>
      <p className="num mt-4 text-2xl font-bold leading-none tracking-tight text-ink sm:text-[1.7rem]">{value}</p>
      <p className="mt-2 text-sm font-medium text-ink/80">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* Badge de score de relevancia */
export function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 85
      ? "bg-accent-500/10 text-accent-600 ring-accent-500/25"
      : score >= 70
        ? "bg-brand-600/10 text-brand-700 ring-brand-600/20 dark:text-brand-300"
        : "bg-slate-500/10 text-slate-500 ring-slate-500/20";
  return (
    <span
      className={`num inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${cls}`}
      title="Afinidad con los rubros de tu empresa"
    >
      {score}%
      <span className="font-medium opacity-70">match</span>
    </span>
  );
}

/* Badge de estado de licitación */
export function EstadoBadge({ estado }: { estado: EstadoLicitacion }) {
  const map: Record<EstadoLicitacion, string> = {
    Publicada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Cerrada: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    Adjudicada: "bg-brand-600/10 text-brand-700 dark:text-brand-300",
    Desierta: "bg-red-500/10 text-red-600",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${map[estado]}`}>
      {estado}
    </span>
  );
}

/* Tipo de oportunidad */
export function TipoBadge({ tipo, tipoLic }: { tipo: string; tipoLic?: string }) {
  const agil = tipo === "Compra Ágil";
  const Icon = agil ? Zap : FileText;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        agil
          ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
          : "bg-sky-500/10 text-sky-700 dark:text-sky-400"
      }`}
    >
      <Icon size={11} />
      {agil ? "Compra Ágil" : `Licitación${tipoLic ? ` ${tipoLic}` : ""}`}
    </span>
  );
}

/* Plazo de cierre con urgencia por color */
export function CierreBadge({ cierre, cierreHora }: { cierre: string; cierreHora?: string }) {
  const d = cierre ? diasRestantes(cierre) : 99;
  const cls =
    d <= 1
      ? "bg-red-500/10 text-red-600"
      : d <= 5
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-slate-500/10 text-slate-600 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <Clock size={12} />
      {textoCierre(cierreHora, cierre)}
    </span>
  );
}

/* Encabezado de página del dashboard */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* Estado vacío */
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: ElementType;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600/10 text-brand-600">
        <Icon size={22} />
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}
