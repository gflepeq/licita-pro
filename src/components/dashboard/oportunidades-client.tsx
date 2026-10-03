"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { EmptyState } from "@/components/dashboard/ui";
import { LicitacionModal } from "@/components/dashboard/licitacion-modal";
import { OportunidadCard } from "@/components/dashboard/licitaciones-client";
import { useToast } from "@/components/toast";
import { toggleSavedAction } from "@/lib/actions/saved";
import { diasRestantes, type Licitacion } from "@/lib/data";

export function OportunidadesClient({ items }: { items: Licitacion[] }) {
  const [list, setList] = useState<Licitacion[]>(items);
  const [selected, setSelected] = useState<Licitacion | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();

  // En esta página todo está guardado; alternar = quitar de guardados.
  const unsave = (l: Licitacion) => {
    setList((prev) => prev.filter((x) => x.codigo !== l.codigo));
    setSelected(null);
    startTransition(async () => {
      await toggleSavedAction(l);
      toast("Quitada de guardadas");
    });
  };

  const { abiertas, cerradas } = useMemo(() => {
    const abierta = (l: Licitacion) => l.estado === "Publicada" && (!l.cierre || diasRestantes(l.cierre) >= 0);
    return {
      abiertas: list.filter(abierta).sort((a, b) => (a.cierre || "9999").localeCompare(b.cierre || "9999")),
      cerradas: list.filter((l) => !abierta(l)),
    };
  }, [list]);

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Aún no guardas oportunidades"
        text="Marca con el ícono de guardar las licitaciones que quieras seguir y aparecerán aquí, ordenadas por fecha de cierre."
      >
        <Link href="/dashboard/licitaciones" className="btn-primary">
          Explorar oportunidades
        </Link>
      </EmptyState>
    );
  }

  const grid = (ls: Licitacion[]) => (
    <div className="grid gap-3 xl:grid-cols-2">
      {ls.map((l) => (
        <OportunidadCard key={l.codigo} l={l} saved onOpen={() => setSelected(l)} onToggle={() => unsave(l)} />
      ))}
    </div>
  );

  return (
    <>
      {abiertas.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Abiertas · por fecha de cierre ({abiertas.length})</h2>
          {grid(abiertas)}
        </section>
      )}
      {cerradas.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-3">Cerradas o finalizadas ({cerradas.length})</h2>
          <div className="opacity-80">{grid(cerradas)}</div>
        </section>
      )}

      <LicitacionModal licitacion={selected} saved onToggleSaved={unsave} onClose={() => setSelected(null)} />
    </>
  );
}
