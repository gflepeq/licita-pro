"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PALETA = ["var(--brand-600)", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#94a3b8"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--ink)",
  fontSize: 12,
  boxShadow: "0 12px 32px -12px rgb(15 23 42 / 0.25)",
};

export interface SerieCierre {
  dia: string; // etiqueta corta (ej. "lun 6")
  relevantes: number;
  otras: number;
}

/* Barras apiladas: cuántas oportunidades cierran cada día (próximos 14 días). */
export function CierresChart({ data }: { data: SerieCierre[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ left: -24, right: 4, top: 8 }} barCategoryGap="22%">
        <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} interval={0} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
        <Tooltip cursor={{ fill: "var(--subtle)" }} contentStyle={tooltipStyle} />
        <Bar dataKey="relevantes" name="Relevantes para ti" stackId="a" fill="var(--brand-600)" />
        <Bar dataKey="otras" name="Otras" stackId="a" fill="var(--brand-200)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* Dona de distribución (rubros, tipos…). */
export function DistribucionChart({ data }: { data: { nombre: string; valor: number }[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0) || 1;
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-muted">Aún no hay coincidencias con tus rubros.</p>;
  }
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col">
      <div className="h-[170px] w-[170px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="valor" nameKey="nombre" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={PALETA[i % PALETA.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full flex-1 space-y-2">
        {data.map((c, i) => (
          <li key={c.nombre} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-ink">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETA[i % PALETA.length] }} />
              <span className="truncate">{c.nombre}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-muted">{Math.round((c.valor / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Barras horizontales simples (sin recharts, más livianas). */
export function RankingBars({ data }: { data: { nombre: string; valor: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.valor));
  if (!data.length) return <p className="py-6 text-center text-sm text-muted">Sin datos de región todavía.</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.nombre}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate text-ink">{d.nombre}</span>
            <span className="font-semibold tabular-nums text-muted">{d.valor}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${(d.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
