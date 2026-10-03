"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkX, Building2 } from "lucide-react";
import { CierreBadge, EmptyState, EstadoBadge, ScoreBadge, TipoBadge } from "@/components/dashboard/ui";
import { LicitacionModal } from "@/components/dashboard/licitacion-modal";
import { toggleSavedAction } from "@/lib/actions/saved";
import { fmtCLPCorto, type Licitacion } from "@/lib/data";

export function OportunidadesClient({ items }: { items: Licitacion[] }) {
  const [list, setList] = useState<Licitacion[]>(items);
  const [selected, setSelected] = useState<Licitacion | null>(null);
  const [, startTransition] = useTransition();

  // En esta página todo está guardado; alternar = quitar de guardados.
  const unsave = (l: Licitacion) => {
    setList((prev) => prev.filter((x) => x.codigo !== l.codigo));
    setSelected(null);
    startTransition(() => {
      toggleSavedAction(l);
    });
  };

  if (list.length === 0) {
    return (
      <EmptyState icon={BookmarkX} title="Aún no guardas oportunidades">
        Marca con <Bookmark size={13} className="-mt-0.5 inline" /> las que quieras seguir y aquí verás su
        estado y plazo actualizados.
        <Link
          href="/dashboard/licitaciones"
          className="mt-4 block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Explorar licitaciones
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((l) => (
          <article
            key={l.codigo}
            onClick={() => setSelected(l)}
            className="card card-hover flex min-w-0 cursor-pointer flex-col p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <TipoBadge tipo={l.tipo} tipoLic={l.tipoLic} />
                <EstadoBadge estado={l.estado} />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  unsave(l);
                }}
                aria-label="Quitar de guardados"
                title="Quitar de guardados"
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface"
              >
                <Bookmark size={17} className="fill-brand-600 text-brand-600" />
              </button>
            </div>
            <p className="mt-3 line-clamp-2 font-semibold leading-snug text-ink">{l.nombre}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Building2 size={12} className="shrink-0" />
              <span className="truncate">{l.organismo}</span>
            </p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
              {l.estado === "Publicada" ? (
                <CierreBadge cierre={l.cierre} cierreHora={l.cierreHora} />
              ) : (
                <span className="text-xs text-muted">Ya no recibe ofertas</span>
              )}
              <div className="flex items-center gap-2">
                <span className="num text-sm font-bold text-ink">{l.monto > 0 ? fmtCLPCorto(l.monto) : "—"}</span>
                <ScoreBadge score={l.score} />
              </div>
            </div>
          </article>
        ))}
      </div>

      <LicitacionModal
        licitacion={selected}
        saved
        onToggleSaved={unsave}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
