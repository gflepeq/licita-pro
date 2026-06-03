import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bell, Bookmark, Clock, Radio, Sparkles } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import { CategoriaChart, DeteccionChart } from "@/components/dashboard/charts";
import { TopRelevantes } from "@/components/dashboard/top-relevantes";
import { currentUser } from "@/lib/current-user";
import { getLicitaciones } from "@/lib/mercadopublico";
import { listSavedCodes } from "@/lib/db";
import { diasRestantes, stats } from "@/lib/data";

// El enriquecimiento de la API puede tardar; ampliamos el límite en Vercel.
export const maxDuration = 60;

export default async function DashboardHome() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const { items, source } = await getLicitaciones(user.rubros);
  const saved = await listSavedCodes(user.id);

  const publicadas = items.filter((l) => l.estado === "Publicada");
  const topRelevantes = [...publicadas].sort((a, b) => b.score - a.score).slice(0, 5);
  const relevantes = items.filter((l) => l.score >= user.umbral).length;
  const cierranPronto = publicadas.filter(
    (l) => l.cierre && diasRestantes(l.cierre) >= 0 && diasRestantes(l.cierre) <= 5
  ).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title={`Hola, ${user.nombre.split(" ")[0]} 👋`}
          subtitle="Esto es lo que detectamos para tu empresa hoy."
        />
        <div className="flex items-center gap-3">
          {source === "live" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-semibold text-accent-600">
              <Radio size={12} /> En vivo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
              Demo
            </span>
          )}
          <Link
            href="/dashboard/licitaciones"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Ver todas
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="Oportunidades detectadas"
          value={String(items.length)}
          delta={`+${stats.oportunidadesNuevasDelta}`}
        />
        <StatCard
          icon={Bell}
          label={`Relevantes (score ≥ ${user.umbral})`}
          value={String(relevantes)}
          tone="accent"
        />
        <StatCard
          icon={Clock}
          label="Cierran en ≤ 5 días"
          value={String(cierranPronto)}
          tone="amber"
        />
        <StatCard
          icon={Bookmark}
          label="Oportunidades guardadas"
          value={String(saved.length)}
        />
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Detección mensual</h2>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-600" /> Detectadas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-500" /> Relevantes
              </span>
            </div>
          </div>
          <DeteccionChart />
        </div>
        <div className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-4 font-semibold text-ink">Por categoría</h2>
          <CategoriaChart />
        </div>
      </div>

      {/* Top relevantes */}
      <div className="mt-6 rounded-2xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold text-ink">Oportunidades más relevantes</h2>
          <Link
            href="/dashboard/licitaciones"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Ver todas <ArrowUpRight size={15} />
          </Link>
        </div>
        <TopRelevantes items={topRelevantes} savedCodes={saved} />
      </div>
    </div>
  );
}
