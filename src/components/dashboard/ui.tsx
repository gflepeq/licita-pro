import type { ElementType, ReactNode } from "react";
import type { EstadoLicitacion } from "@/lib/data";

/* Tarjeta de KPI */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "brand",
}: {
  icon: ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "accent" | "amber" | "violet";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600 ring-brand-100",
    accent: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 ring-amber-500/15 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-400",
  };
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${tones[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* Indicador de match (anillo con porcentaje) */
export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const color = score >= 88 ? "#10b981" : score >= 75 ? "var(--brand-600)" : score >= 60 ? "#f59e0b" : "#94a3b8";
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`Match ${score}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--subtle)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-bold text-ink tabular-nums">{score}</span>
    </div>
  );
}

/* Badge de score de relevancia */
export function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 88
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : score >= 75
        ? "bg-brand-50 text-brand-700 dark:text-brand-300"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return (
    <span className={`chip ${cls}`}>
      <span className="font-bold tabular-nums">{score}</span>
      <span className="font-medium opacity-70">match</span>
    </span>
  );
}

/* Badge de estado de licitación */
export function EstadoBadge({ estado }: { estado: EstadoLicitacion }) {
  const map: Record<EstadoLicitacion, string> = {
    Publicada: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Cerrada: "bg-subtle text-muted",
    Adjudicada: "bg-brand-50 text-brand-700 dark:text-brand-300",
    Desierta: "bg-red-500/10 text-red-600 dark:text-red-400",
    Revocada: "bg-red-500/10 text-red-600 dark:text-red-400",
    Suspendida: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };
  return (
    <span className={`chip ${map[estado] ?? map.Cerrada}`}>
      {estado === "Publicada" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {estado}
    </span>
  );
}

/* Badge "en vivo" / "demo" */
export function SourceBadge({ source, fetchedAt }: { source: "live" | "demo"; fetchedAt?: string }) {
  if (source === "live") {
    const hora = fetchedAt
      ? new Date(fetchedAt).toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Santiago",
        })
      : null;
    return (
      <span className="chip bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" title="Datos oficiales de la API de Mercado Público">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        En vivo · Mercado Público{hora ? ` · ${hora}` : ""}
      </span>
    );
  }
  return <span className="chip bg-amber-500/10 text-amber-700 dark:text-amber-400">Datos de demostración</span>;
}

/* Encabezado de página del dashboard */
export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">{title}</h1>
          {badge}
        </div>
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
  text,
  children,
}: {
  icon: ElementType;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon size={22} />
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/* Sección con título dentro de una card */
export function Panel({
  title,
  icon: Icon,
  actions,
  children,
  className = "",
  bodyClassName = "p-5",
}: {
  title: string;
  icon?: ElementType;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          {Icon && <Icon size={17} className="text-brand-600" />}
          {title}
        </h2>
        {actions}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
