import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, FileSearch, Search } from "lucide-react";
import { EmptyState, PageHeader, TipoBadge, CierreBadge } from "@/components/dashboard/ui";
import { PlanLock } from "@/components/dashboard/plan-lock";
import { AnalisisClient } from "@/components/dashboard/analisis-client";
import { currentUser } from "@/lib/current-user";
import { listSaved } from "@/lib/db";
import { getOportunidad, getOportunidades } from "@/lib/oportunidades";
import { iaDisponible } from "@/lib/ia";
import type { Licitacion } from "@/lib/data";
import { tiposDelPlan } from "@/lib/capacidades";

export const dynamic = "force-dynamic";

export default async function AnalisisPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const header = (
    <PageHeader
      title="Análisis con IA"
      subtitle="Evalúa si te conviene postular: resumen, viabilidad para tu empresa, requisitos, riesgos y plazos."
    />
  );

  if (!user.capacidades.includes("analisis_ia")) {
    return (
      <div>
        {header}
        <PlanLock texto="El análisis con IA está disponible en planes superiores." />
      </div>
    );
  }

  const { codigo } = await searchParams;
  const encontrada = codigo ? await getOportunidad(codigo, user.rubros) : null;
  const l = encontrada && tiposDelPlan(user.capacidades).includes(encontrada.tipo) ? encontrada : null;
  if (l) return <AnalisisClient licitacion={l} disponible={iaDisponible()} />;

  // Sin oportunidad elegida: sugerimos las guardadas.
  const guardadas = (await listSaved(user.id)) as Licitacion[];
  const actuales = await getOportunidades(guardadas.map((g) => g.codigo), user.rubros);
  const abiertas = actuales.filter(
    (x) => x.estado === "Publicada" && tiposDelPlan(user.capacidades).includes(x.tipo)
  );

  return (
    <div>
      {header}
      {codigo && (
        <p className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          No encontramos la oportunidad {codigo} en el catálogo.
        </p>
      )}
      {abiertas.length ? (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <Bookmark size={16} /> Elige una de tus oportunidades guardadas
            </h2>
            <Link href="/dashboard/licitaciones" className="text-sm font-semibold text-brand-600">
              Buscar otra
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {abiertas.map((o) => (
              <li key={o.codigo}>
                <Link
                  href={`/dashboard/analisis?codigo=${encodeURIComponent(o.codigo)}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface/70"
                >
                  <div className="min-w-0">
                    <TipoBadge tipo={o.tipo} tipoLic={o.tipoLic} />
                    <p className="mt-1 line-clamp-1 font-medium text-ink">{o.nombre}</p>
                    <p className="truncate text-xs text-muted">{o.organismo}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <CierreBadge cierre={o.cierre} cierreHora={o.cierreHora} />
                    <span className="inline-flex items-center gap-1.5 rounded-lg btn-ink px-3 py-2 text-xs font-semibold">
                      <FileSearch size={14} /> Analizar
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState icon={Search} title="Elige una oportunidad para analizar">
          Abre cualquier licitación o compra ágil y presiona <strong>“Analizar con IA”</strong>.
          <Link
            href="/dashboard/licitaciones"
            className="mt-4 block rounded-lg btn-ink px-4 py-2.5 text-sm font-semibold"
          >
            Ir a Licitaciones
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
