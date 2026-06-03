"use client";

import { useMemo, useState, useTransition } from "react";
import { Bookmark, FileSearch, Radio, Search } from "lucide-react";
import { EstadoBadge, ScoreBadge } from "@/components/dashboard/ui";
import { toggleSavedAction } from "@/lib/actions/saved";
import {
  diasRestantes,
  fmtCLP,
  fmtFecha,
  type Licitacion,
  type TipoOportunidad,
} from "@/lib/data";

const tipos: (TipoOportunidad | "Todas")[] = ["Todas", "Licitación", "Compra Ágil"];

export function LicitacionesClient({
  data,
  savedCodes,
  source,
}: {
  data: Licitacion[];
  savedCodes: string[];
  source: "live" | "demo";
}) {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<(typeof tipos)[number]>("Todas");
  const [soloPublicadas, setSoloPublicadas] = useState(false);
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(savedCodes.map((c) => [c, true]))
  );

  const toggle = (l: Licitacion) => {
    setSaved((s) => ({ ...s, [l.codigo]: !s[l.codigo] }));
    startTransition(() => {
      toggleSavedAction(l);
    });
  };

  const rows = useMemo(() => {
    return data
      .filter((l) => (tipo === "Todas" ? true : l.tipo === tipo))
      .filter((l) => (soloPublicadas ? l.estado === "Publicada" : true))
      .filter((l) => {
        const t = q.toLowerCase();
        return (
          !t ||
          l.nombre.toLowerCase().includes(t) ||
          l.organismo.toLowerCase().includes(t) ||
          l.codigo.toLowerCase().includes(t) ||
          l.categoria.toLowerCase().includes(t)
        );
      })
      .sort((a, b) => b.score - a.score);
  }, [data, q, tipo, soloPublicadas]);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Licitaciones</h1>
        {source === "live" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-semibold text-accent-600">
            <Radio size={12} /> Datos en vivo · Mercado Público
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
            Datos de demostración
          </span>
        )}
      </div>
      <p className="mb-6 text-sm text-muted">
        {rows.length} oportunidades ordenadas por relevancia para tu perfil.
      </p>

      {/* Filtros */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, organismo, código o rubro…"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-10 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {tipos.map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tipo === t
                  ? "bg-brand-600 text-white"
                  : "border border-line text-muted hover:bg-surface"
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => setSoloPublicadas((v) => !v)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              soloPublicadas
                ? "bg-accent-500 text-white"
                : "border border-line text-muted hover:bg-surface"
            }`}
          >
            Solo abiertas
          </button>
        </div>
      </div>

      {/* Tabla (desktop) */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-card lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Relevancia</th>
              <th className="px-4 py-3">Licitación</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Cierre</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((l) => {
              const dias = diasRestantes(l.cierre);
              return (
                <tr key={l.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <ScoreBadge score={l.score} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-md font-medium text-ink">{l.nombre}</p>
                    <p className="text-xs text-muted">
                      {l.organismo} · {l.codigo}
                      {l.region !== "—" ? ` · ${l.region}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted">{l.tipo}</td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {l.monto > 0 ? fmtCLP(l.monto) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{l.cierre ? fmtFecha(l.cierre) : "—"}</p>
                    {l.estado === "Publicada" && l.cierre && (
                      <p className={`text-xs ${dias <= 3 ? "text-red-600" : "text-muted"}`}>
                        {dias > 0 ? `${dias} días` : "Hoy"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={l.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggle(l)}
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface"
                        aria-label="Guardar"
                      >
                        <Bookmark
                          size={17}
                          className={
                            saved[l.codigo]
                              ? "fill-brand-600 text-brand-600"
                              : "text-slate-300"
                          }
                        />
                      </button>
                      <button className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-brand-600" aria-label="Analizar">
                        <FileSearch size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards (móvil) */}
      <div className="space-y-3 lg:hidden">
        {rows.map((l) => (
          <div key={l.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <ScoreBadge score={l.score} />
              <button onClick={() => toggle(l)} aria-label="Guardar">
                <Bookmark
                  size={18}
                  className={
                    saved[l.codigo] ? "fill-brand-600 text-brand-600" : "text-slate-300"
                  }
                />
              </button>
            </div>
            <p className="mt-2 font-medium text-ink">{l.nombre}</p>
            <p className="text-xs text-muted">
              {l.organismo} · {l.codigo}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-semibold text-ink">
                {l.monto > 0 ? fmtCLP(l.monto) : "—"}
              </span>
              <EstadoBadge estado={l.estado} />
            </div>
            {l.cierre && (
              <p className="mt-1 text-xs text-muted">Cierra {fmtFecha(l.cierre)}</p>
            )}
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-card py-16 text-center">
          <p className="text-sm text-muted">No hay resultados para tu búsqueda.</p>
        </div>
      )}
    </div>
  );
}
