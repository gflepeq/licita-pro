"use client";

import { useState, useTransition } from "react";
import { Clock } from "lucide-react";
import { ScoreRing } from "@/components/dashboard/ui";
import { LicitacionModal } from "@/components/dashboard/licitacion-modal";
import { useToast } from "@/components/toast";
import { toggleSavedAction } from "@/lib/actions/saved";
import { diasRestantes, fmtMonto, textoCierre, type Licitacion } from "@/lib/data";

export function TopRelevantes({ items, savedCodes }: { items: Licitacion[]; savedCodes: string[] }) {
  const [selected, setSelected] = useState<Licitacion | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>(Object.fromEntries(savedCodes.map((c) => [c, true])));
  const [, startTransition] = useTransition();
  const toast = useToast();

  const toggle = (l: Licitacion) => {
    setSaved((s) => ({ ...s, [l.codigo]: !s[l.codigo] }));
    startTransition(async () => {
      const r = await toggleSavedAction(l);
      if (r.limit) {
        setSaved((s) => ({ ...s, [l.codigo]: false }));
        toast("Alcanzaste el límite de guardadas de tu plan.", "error");
      } else toast(r.saved ? "Guardada en tus oportunidades" : "Quitada de guardadas");
    });
  };

  if (!items.length) {
    return <p className="px-5 py-10 text-center text-sm text-muted">No hay oportunidades abiertas en este momento.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((l) => {
          const dias = l.cierre ? diasRestantes(l.cierre) : null;
          return (
            <li
              key={l.id}
              onClick={() => setSelected(l)}
              className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface"
            >
              <ScoreRing score={l.score} size={40} />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-ink">{l.nombre}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                  {l.organismo || l.tipo}
                  {l.region !== "—" ? ` · ${l.region}` : ""}
                </p>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-sm font-semibold tabular-nums text-ink">{l.monto > 0 ? fmtMonto(l.monto, l.moneda) : "—"}</p>
                {dias !== null && (
                  <p className={`inline-flex items-center gap-1 text-xs ${dias <= 3 ? "font-semibold text-red-600 dark:text-red-400" : "text-muted"}`}>
                    <Clock size={11} /> {textoCierre(l.cierre, l.cierreHora)}
                  </p>
                )}
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
