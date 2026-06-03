"use client";

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { distribucionCategoria, serieDeteccion } from "@/lib/data";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#64748b"];

export function DeteccionChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={serieDeteccion} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gDet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gRel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="mes"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#64748b", fontSize: 12 }}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="detectadas"
          name="Detectadas"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#gDet)"
        />
        <Area
          type="monotone"
          dataKey="relevantes"
          name="Relevantes"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#gRel)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoriaChart() {
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={180}>
        <PieChart>
          <Pie
            data={distribucionCategoria}
            dataKey="valor"
            nameKey="categoria"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
          >
            {distribucionCategoria.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-2">
        {distribucionCategoria.map((c, i) => (
          <li key={c.categoria} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {c.categoria}
            </span>
            <span className="font-semibold text-muted">{c.valor}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
