"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltip = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid var(--line)",
    background: "var(--card)",
    color: "var(--ink)",
    fontSize: 12,
    boxShadow: "var(--shadow-pop)",
  },
  labelStyle: { color: "var(--muted)", marginBottom: 4 },
};
const tick = { fill: "#94a3b8", fontSize: 11 };
const nf = new Intl.NumberFormat("es-CL");

/** Oportunidades publicadas por día (últimos 14 días). */
export function PublicacionesChart({ data }: { data: { dia: string; total: number }[] }) {
  const rows = data.map((d) => ({
    ...d,
    label: new Date(d.dia + "T12:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
  }));
  return (
    <div className="text-brand-600">
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={rows} margin={{ left: -14, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gPub" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.18} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tick={tick} width={44} />
        <Tooltip {...tooltip} formatter={(v) => [nf.format(Number(v)), "Publicadas"]} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="currentColor"
          strokeWidth={2.2}
          fill="url(#gPub)"
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}

/** Oportunidades abiertas por región. */
export function RegionesChart({ data }: { data: { region: string; total: number }[] }) {
  return (
    <div className="text-brand-600">
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="region"
          tickLine={false}
          axisLine={false}
          tick={tick}
          width={110}
        />
        <Tooltip {...tooltip} cursor={{ fill: "#94a3b8", fillOpacity: 0.1 }} formatter={(v) => [nf.format(Number(v)), "Abiertas"]} />
        <Bar dataKey="total" fill="currentColor" radius={[0, 6, 6, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
