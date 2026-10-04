import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bookmark, Clock, Radio, Sparkles, Wallet } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/dashboard/ui";
import { PublicacionesChart, RegionesChart } from "@/components/dashboard/charts";
import { TopRelevantes } from "@/components/dashboard/top-relevantes";
import { currentUser } from "@/lib/current-user";
import { buscarOportunidades, resumenCatalogo } from "@/lib/oportunidades";
import { listSavedCodes } from "@/lib/db";
import { diasRestantes, fmtCLPCorto } from "@/lib/data";
import { LIMITE_GUARDADAS, tiposDelPlan } from "@/lib/capacidades";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("es-CL");

function haceCuanto(iso: string | null): string {
  if (!iso) return "sincronizando…";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "recién actualizado";
  if (min < 60) return `actualizado hace ${min} min`;
  return `actualizado hace ${Math.round(min / 60)} h`;
}

export default async function DashboardHome() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const tipos = tiposDelPlan(user.capacidades);

  // Una sola consulta: todas las abiertas del plan, ya ordenadas por relevancia.
  const [resumen, todas, saved] = await Promise.all([
    resumenCatalogo(),
    buscarOportunidades(user.rubros, { tipos, orden: "relevancia", porPagina: 100000 }),
    listSavedCodes(user.id),
  ]);
  const conRubros = user.rubros.length
    ? todas.items.filter((l) => (l.rubrosMatch ?? []).length > 0)
    : todas.items;
  const top = conRubros.length ? conRubros.slice(0, 6) : todas.items.slice(0, 6);
  const urgentes = conRubros.filter((l) => diasRestantes(l.cierre) <= 7).length;

  const nombre = user.nombre.split(" ")[0];

  return (
    <div>
      <PageHeader
        title={`Hola, ${nombre}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            Así está Mercado Público hoy para {user.empresa || "tu empresa"}.
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-semibold text-accent-600">
              <Radio size={11} /> {haceCuanto(resumen.ultimaActualizacion)}
            </span>
          </span>
        }
        actions={
          <Link
            href="/dashboard/licitaciones"
            className="inline-flex items-center gap-1.5 rounded-lg btn-ink px-4 py-2.5 text-sm font-semibold"
          >
            Explorar oportunidades <ArrowUpRight size={15} />
          </Link>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="Para tus rubros"
          value={nf.format(conRubros.length)}
          hint={`de ${nf.format(todas.total)} abiertas en tu plan`}
          tone="accent"
        />
        <StatCard
          icon={Clock}
          label="Cierran en 7 días"
          value={nf.format(urgentes)}
          hint={user.rubros.length ? "de tus rubros · no las dejes pasar" : "en todo Mercado Público"}
          tone="amber"
        />
        <StatCard
          icon={Wallet}
          label="Monto abierto hoy"
          value={fmtCLPCorto(resumen.montoAbierto)}
          hint={`${nf.format(resumen.abiertas)} oportunidades · ${nf.format(resumen.nuevasHoy)} nuevas hoy`}
        />
        <StatCard
          icon={Bookmark}
          label="Guardadas"
          value={nf.format(saved.length)}
          hint={
            user.capacidades.includes("guardadas_ilimitadas")
              ? "en seguimiento"
              : `de ${LIMITE_GUARDADAS} incluidas en tu plan`
          }
          tone="violet"
        />
      </div>

      {/* Más relevantes */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-semibold text-ink">Más relevantes para ti</h2>
            <p className="text-xs text-muted">
              Según tus rubros: {user.rubros.length ? user.rubros.join(", ") : "aún no configurados"}
            </p>
          </div>
          <Link
            href="/dashboard/licitaciones"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Ver todas <ArrowUpRight size={15} />
          </Link>
        </div>
        {top.length ? (
          <TopRelevantes items={top} savedCodes={saved} />
        ) : (
          <div className="p-5">
            <EmptyState icon={Radio} title="Estamos sincronizando Mercado Público">
              La primera carga del catálogo tarda unos minutos. Las oportunidades aparecerán aquí
              automáticamente.
            </EmptyState>
          </div>
        )}
      </div>

      {/* Mercado */}
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-semibold text-ink">Publicaciones diarias</h2>
              <p className="text-xs text-muted">Licitaciones y Compras Ágiles publicadas · últimos 14 días</p>
            </div>
          </div>
          <PublicacionesChart data={resumen.porDia} />
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-ink">Abiertas por región</h2>
          <p className="mb-3 text-xs text-muted">Top 8 regiones con más oportunidades</p>
          <RegionesChart data={resumen.porRegion} />
        </div>
      </div>

      {/* Desglose */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Licitaciones abiertas</p>
          <p className="num mt-2 text-2xl font-bold text-ink">{nf.format(resumen.licitaciones)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Compras Ágiles abiertas</p>
          <p className="num mt-2 text-2xl font-bold text-ink">{nf.format(resumen.comprasAgiles)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cierran hoy</p>
          <p className="num mt-2 text-2xl font-bold text-ink">{nf.format(resumen.cierranHoy)}</p>
        </div>
      </div>
    </div>
  );
}
