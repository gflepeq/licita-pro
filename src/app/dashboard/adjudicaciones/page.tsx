import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Building2, ExternalLink, FileText, Receipt, Trophy, Users, Wallet } from "lucide-react";
import { EmptyState, PageHeader, Panel, SourceBadge, StatCard } from "@/components/dashboard/ui";
import { currentUser } from "@/lib/current-user";
import { getAdjudicacionesMercado, getOrdenesProveedor } from "@/lib/mercadopublico";
import { fmtCLP, fmtCLPCorto, fmtFecha, fmtMonto } from "@/lib/data";

export const maxDuration = 60;

export default async function AdjudicacionesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const perfil = { rubros: user.rubros, regiones: user.regiones, keywords: user.keywords };
  const [mercado, ordenes] = await Promise.all([
    getAdjudicacionesMercado(perfil),
    user.rut ? getOrdenesProveedor(user.rut) : Promise.resolve(null),
  ]);

  const relevantes = mercado.items.filter((a) => a.proveedores.length > 0);
  const montoMercado = relevantes.reduce((s, a) => s + a.montoTotal, 0);
  const promOferentes = relevantes.filter((a) => a.oferentes).length
    ? relevantes.reduce((s, a) => s + a.oferentes, 0) / relevantes.filter((a) => a.oferentes).length
    : 0;
  const montoOC = (ordenes?.items ?? []).reduce((s, o) => s + (o.moneda === "CLP" ? o.total : 0), 0);

  // Proveedores que más ganan en tus rubros (competencia).
  const competencia = new Map<string, { nombre: string; monto: number; veces: number }>();
  relevantes.forEach((a) =>
    a.proveedores.forEach((p) => {
      const c = competencia.get(p.nombre) ?? { nombre: p.nombre, monto: 0, veces: 0 };
      c.monto += p.monto;
      c.veces += 1;
      competencia.set(p.nombre, c);
    })
  );
  const topCompetencia = Array.from(competencia.values()).sort((a, b) => b.monto - a.monto).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adjudicaciones"
        subtitle="Quién gana en tus rubros y las órdenes de compra que recibe tu empresa."
        badge={<SourceBadge source={mercado.source} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Receipt} label="Tus órdenes de compra (14 días)" value={ordenes ? String(ordenes.items.length) : "—"} hint={ordenes?.proveedor || "Agrega tu RUT en Configuración"} tone="accent" />
        <StatCard icon={Wallet} label="Monto en órdenes recibidas" value={montoOC ? fmtCLPCorto(montoOC) : "—"} tone="violet" />
        <StatCard icon={Trophy} label="Adjudicadas en tus rubros (3 días)" value={String(relevantes.length)} hint={montoMercado ? `${fmtCLPCorto(montoMercado)} adjudicados` : undefined} />
        <StatCard icon={Users} label="Oferentes promedio" value={promOferentes ? promOferentes.toFixed(1) : "—"} hint="Nivel de competencia" tone="amber" />
      </div>

      {/* Órdenes de compra propias */}
      <Panel title="Órdenes de compra de tu empresa" icon={Receipt} bodyClassName="">
        {!user.rut ? (
          <div className="p-5">
            <EmptyState icon={Receipt} title="Conecta tu RUT de proveedor" text="Con el RUT de tu empresa consultamos en Mercado Público las órdenes de compra que te emiten los organismos.">
              <Link href="/dashboard/configuracion" className="btn-primary">
                Agregar RUT
              </Link>
            </EmptyState>
          </div>
        ) : ordenes?.error ? (
          <p className="px-5 py-8 text-center text-sm text-muted">{ordenes.error}</p>
        ) : ordenes?.source === "demo" ? (
          <p className="px-5 py-8 text-center text-sm text-muted">Disponible al configurar el ticket de la API de Mercado Público.</p>
        ) : ordenes && ordenes.items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No hay órdenes de compra para tu empresa en los últimos 14 días.</p>
        ) : (
          <ul className="divide-y divide-line">
            {ordenes?.items.map((o) => (
              <li key={o.codigo} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{o.nombre}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {o.organismo || "Organismo"} · <span className="font-mono">{o.codigo}</span>
                    {o.licitacion ? ` · Licitación ${o.licitacion}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink">{o.total ? fmtMonto(o.total, o.moneda) : "—"}</p>
                    <p className="text-xs text-muted">{fmtFecha(o.fecha)}</p>
                  </div>
                  <span className="chip bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{o.estado}</span>
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-brand-600" aria-label="Ver orden de compra">
                    <ExternalLink size={16} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Adjudicaciones del mercado */}
        <Panel title="Adjudicaciones recientes en tus rubros" icon={Award} className="lg:col-span-2" bodyClassName="">
          {mercado.items.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No encontramos adjudicaciones recientes para tu perfil.</p>
          ) : (
            <ul className="divide-y divide-line">
              {mercado.items.map((a) => (
                <li key={a.codigo} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap gap-1.5">
                        {a.rubrosMatch.slice(0, 2).map((r) => (
                          <span key={r} className="chip bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            {r}
                          </span>
                        ))}
                        {a.oferentes > 0 && <span className="chip bg-subtle text-muted">{a.oferentes} oferentes</span>}
                      </div>
                      <p className="font-medium text-ink">{a.nombre}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                        <Building2 size={12} /> {a.organismo || "Organismo"} · <span className="font-mono">{a.codigo}</span> · {fmtFecha(a.fecha)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-ink">{a.montoTotal ? fmtCLP(a.montoTotal) : "—"}</p>
                      <div className="mt-1 flex justify-end gap-3 text-xs">
                        {a.urlActa && (
                          <a href={a.urlActa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline">
                            <FileText size={12} /> Acta
                          </a>
                        )}
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline">
                          <ExternalLink size={12} /> Ficha
                        </a>
                      </div>
                    </div>
                  </div>
                  {a.proveedores.length > 0 && (
                    <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                      <Trophy size={12} className="mr-1 inline text-amber-500" />
                      Ganó{a.proveedores.length > 1 ? "aron" : ""}:{" "}
                      {a.proveedores.slice(0, 3).map((p, i) => (
                        <span key={p.nombre}>
                          {i > 0 && ", "}
                          <span className="font-semibold text-ink">{p.nombre}</span>
                          {p.monto ? ` (${fmtCLPCorto(p.monto)})` : ""}
                        </span>
                      ))}
                      {a.proveedores.length > 3 ? ` y ${a.proveedores.length - 3} más` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Tu competencia" icon={Users}>
          {topCompetencia.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Sin datos suficientes todavía.</p>
          ) : (
            <ol className="space-y-3">
              {topCompetencia.map((c, i) => (
                <li key={c.nombre} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700 dark:text-brand-300">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{c.nombre}</p>
                    <p className="text-xs text-muted">
                      {c.veces} adjudicación{c.veces === 1 ? "" : "es"} · {fmtCLPCorto(c.monto)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
            Proveedores que más se adjudicaron licitaciones de tus rubros en los últimos días.
          </p>
        </Panel>
      </div>
    </div>
  );
}
