import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Bookmark, CalendarClock, Clock, Flame, MapPin, PieChart, Sparkles, Target, Wallet } from "lucide-react";
import { PageHeader, Panel, SourceBadge, StatCard } from "@/components/dashboard/ui";
import { CierresChart, DistribucionChart, RankingBars, type SerieCierre } from "@/components/dashboard/charts";
import { TopRelevantes } from "@/components/dashboard/top-relevantes";
import { currentUser } from "@/lib/current-user";
import { getLicitaciones } from "@/lib/mercadopublico";
import { listSaved, listSavedCodes } from "@/lib/db";
import { diasRestantes, fmtCLPCorto, hoyChile, textoCierre, type Licitacion } from "@/lib/data";

// La primera carga sin caché puede tardar; ampliamos el límite en Vercel.
export const maxDuration = 60;

function saludo() {
  const h = Number(
    new Intl.DateTimeFormat("es-CL", { hour: "numeric", hour12: false, timeZone: "America/Santiago" }).format(new Date())
  );
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

export default async function DashboardHome() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const perfil = { rubros: user.rubros, regiones: user.regiones, keywords: user.keywords };
  const [{ items: todos, source, totales, fetchedAt }, savedCodes, guardadas] = await Promise.all([
    getLicitaciones(perfil),
    listSavedCodes(user.id),
    listSaved(user.id) as Promise<Licitacion[]>,
  ]);

  // Enforcement por plan: solo tipos incluidos en el plan.
  const tipos: string[] = [];
  if (user.capacidades.includes("licitaciones")) tipos.push("Licitación");
  if (user.capacidades.includes("compra_agil")) tipos.push("Compra Ágil");
  const items = todos.filter((l) => tipos.includes(l.tipo));
  const total = tipos.reduce((s, t) => s + (totales[t as keyof typeof totales] ?? 0), 0);

  const abiertas = items.filter((l) => l.estado === "Publicada" && (!l.cierre || diasRestantes(l.cierre) >= 0));
  const relevantes = abiertas.filter((l) => l.score >= user.umbral);
  const top = [...abiertas].sort((a, b) => b.score - a.score).slice(0, 6);
  const urgentes = relevantes.filter((l) => l.cierre && diasRestantes(l.cierre) <= 5);
  const montoRelevante = relevantes.reduce((s, l) => s + (l.moneda === "CLP" || !l.moneda ? l.monto : 0), 0);

  // Serie: cierres por día (próximos 14 días).
  const hoy = hoyChile();
  const serie: SerieCierre[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoy + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const delDia = abiertas.filter((l) => l.cierre === iso);
    const rel = delDia.filter((l) => l.score >= user.umbral).length;
    return {
      dia: i === 0 ? "Hoy" : d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", timeZone: "UTC" }).replace(".", ""),
      relevantes: rel,
      otras: delDia.length - rel,
    };
  });

  // Distribución por rubro (de las relevantes).
  const porRubro = new Map<string, number>();
  relevantes.forEach((l) => l.rubrosMatch?.forEach((r) => porRubro.set(r, (porRubro.get(r) ?? 0) + 1)));
  const rubrosData = Array.from(porRubro, ([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor);
  const rubrosTop = rubrosData.slice(0, 5);
  const otrosRubros = rubrosData.slice(5).reduce((s, r) => s + r.valor, 0);
  if (otrosRubros) rubrosTop.push({ nombre: "Otros", valor: otrosRubros });

  // Ranking por región.
  const porRegion = new Map<string, number>();
  relevantes.forEach((l) => l.region !== "—" && porRegion.set(l.region, (porRegion.get(l.region) ?? 0) + 1));
  const regionesData = Array.from(porRegion, ([nombre, valor]) => ({ nombre, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  // Guardadas que cierran pronto.
  const guardadasPronto = guardadas
    .filter((l) => l.estado === "Publicada" && l.cierre && diasRestantes(l.cierre) >= 0 && diasRestantes(l.cierre) <= 7)
    .sort((a, b) => a.cierre.localeCompare(b.cierre))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${saludo()}, ${user.nombre.split(" ")[0]}`}
        subtitle={`Esto detectamos hoy para ${user.empresa || "tu empresa"} en Mercado Público.`}
        badge={<SourceBadge source={source} fetchedAt={fetchedAt} />}
        actions={
          <Link href="/dashboard/licitaciones" className="btn-primary">
            Explorar oportunidades <ArrowUpRight size={16} />
          </Link>
        }
      />

      {user.rubros.length === 0 && user.keywords.length === 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50 p-4">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Target size={17} className="text-brand-600" />
            Define tus rubros y palabras clave para que el match sea preciso.
          </p>
          <Link href="/dashboard/configuracion" className="btn-secondary py-2">
            Completar perfil
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Sparkles} label="Vigentes en Mercado Público" value={total.toLocaleString("es-CL")} hint="Licitaciones y compras ágiles abiertas" />
        <StatCard icon={Target} label={`Relevantes para ti (≥ ${user.umbral})`} value={relevantes.length.toLocaleString("es-CL")} hint="Según rubros, palabras clave y regiones" tone="accent" />
        <StatCard icon={Clock} label="Relevantes que cierran en ≤ 5 días" value={String(urgentes.length)} hint="No las dejes pasar" tone="amber" />
        <StatCard icon={Wallet} label="Presupuesto relevante publicado" value={montoRelevante ? fmtCLPCorto(montoRelevante) : "—"} hint={`${savedCodes.length} guardadas en seguimiento`} tone="violet" />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Cierres en los próximos 14 días"
          icon={CalendarClock}
          className="lg:col-span-2"
          actions={
            <div className="hidden items-center gap-4 text-xs text-muted sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-600" /> Relevantes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-200" /> Otras
              </span>
            </div>
          }
        >
          <CierresChart data={serie} />
        </Panel>
        <Panel title="Relevantes por rubro" icon={PieChart}>
          <DistribucionChart data={rubrosTop} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Mejores oportunidades para ti"
          icon={Flame}
          className="lg:col-span-2"
          bodyClassName=""
          actions={
            <Link href="/dashboard/licitaciones" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Ver todas <ArrowUpRight size={15} />
            </Link>
          }
        >
          <TopRelevantes items={top} savedCodes={savedCodes} />
        </Panel>

        <div className="space-y-4">
          <Panel title="Tus guardadas por cerrar" icon={Bookmark} bodyClassName="p-2">
            {guardadasPronto.length ? (
              <ul>
                {guardadasPronto.map((l) => (
                  <li key={l.codigo}>
                    <Link href="/dashboard/oportunidades" className="block rounded-xl px-3 py-2.5 hover:bg-surface">
                      <p className="line-clamp-1 text-sm font-medium text-ink">{l.nombre}</p>
                      <p className={`text-xs ${diasRestantes(l.cierre) <= 2 ? "font-semibold text-red-600 dark:text-red-400" : "text-muted"}`}>
                        {textoCierre(l.cierre, l.cierreHora)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted">Ninguna guardada cierra esta semana.</p>
            )}
          </Panel>
          <Panel title="Regiones con más oportunidades" icon={MapPin}>
            <RankingBars data={regionesData} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
