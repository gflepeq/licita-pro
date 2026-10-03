"use client";

import { useState, useTransition } from "react";
import { Building2 } from "lucide-react";
import { CierreBadge, ScoreBadge, TipoBadge } from "@/components/dashboard/ui";
import { LicitacionModal } from "@/components/dashboard/licitacion-modal";
import { toggleSavedAction } from "@/lib/actions/saved";
import { fmtCLPCorto, type Licitacion } from "@/lib/data";

export function TopRelevantes({
  items,
  savedCodes,
}: {
  items: Licitacion[];
  savedCodes: string[];
}) {
  const [selected, setSelected] = useState<Licitacion | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(savedCodes.map((c) => [c, true]))
  );
  const [, startTransition] = useTransition();

  const toggle = (l: Licitacion) => {
    setSaved((s) => ({ ...s, [l.codigo]: !s[l.codigo] }));
    startTransition(() => {
      toggleSavedAction(l);
    });
  };

  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((l) => (
          <li
            key={l.id}
            onClick={() => setSelected(l)}
            className="flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface/70 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <TipoBadge tipo={l.tipo} tipoLic={l.tipoLic} />
                <ScoreBadge score={l.score} />
              </div>
              <p className="mt-1.5 line-clamp-1 font-medium text-ink">{l.nombre}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <Building2 size={12} className="shrink-0" />
                <span className="truncate">
                  {l.organismo}
                  {l.region !== "—" ? ` · ${l.region}` : ""}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
              <p className="num text-sm font-bold text-ink">{l.monto > 0 ? fmtCLPCorto(l.monto) : "—"}</p>
              <CierreBadge cierre={l.cierre} cierreHora={l.cierreHora} />
            </div>
          </li>
        ))}
      </ul>

      <LicitacionModal
        licitacion={selected}
        saved={selected ? !!saved[selected.codigo] : false}
        onToggleSaved={toggle}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
