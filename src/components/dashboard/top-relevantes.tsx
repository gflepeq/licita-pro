"use client";

import { useState, useTransition } from "react";
import { ScoreBadge } from "@/components/dashboard/ui";
import { LicitacionModal } from "@/components/dashboard/licitacion-modal";
import { toggleSavedAction } from "@/lib/actions/saved";
import { diasRestantes, fmtCLP, fmtFecha, type Licitacion } from "@/lib/data";

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
        {items.map((l) => {
          const dias = l.cierre ? diasRestantes(l.cierre) : null;
          return (
            <li
              key={l.id}
              onClick={() => setSelected(l)}
              className="flex cursor-pointer flex-col gap-3 px-5 py-4 hover:bg-surface/60 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <ScoreBadge score={l.score} />
                <div>
                  <p className="font-medium text-ink">{l.nombre}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {l.organismo} · {l.codigo}
                    {l.region !== "—" ? ` · ${l.region}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 pl-12 sm:pl-0">
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">
                    {l.monto > 0 ? fmtCLP(l.monto) : "—"}
                  </p>
                  {dias !== null && (
                    <p className={`text-xs ${dias <= 3 ? "text-red-600" : "text-muted"}`}>
                      Cierra {fmtFecha(l.cierre)} · {dias}d
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
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
