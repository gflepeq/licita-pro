import Link from "next/link";
import { CheckCircle2, Bookmark, Radio, Users, Wallet } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import { adminStats, listUsers, getPlanes } from "@/lib/db";
import { fmtCLP } from "@/lib/data";
import { resumenCatalogo } from "@/lib/oportunidades";
import { getSyncStatus } from "@/lib/mp-sync";

export const dynamic = "force-dynamic";
const nf = new Intl.NumberFormat("es-CL");
const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short" }) : "—";

export default async function AdminHome() {
  const stats = await adminStats();
  const usuarios = (await listUsers()).slice(0, 6);
  const PLANES = await getPlanes({ all: true });
  const [catalogo, sync] = [await resumenCatalogo(), getSyncStatus()];

  const colores = ["bg-slate-400", "bg-brand-500", "bg-accent-500", "bg-amber-500", "bg-violet-500"];
  const totalPlan = stats.porPlan.reduce((s, p) => s + p.total, 0) || 1;

  return (
    <div>
      <PageHeader
        title="Resumen general"
        subtitle="Vista global de la plataforma: usuarios, planes y pagos."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Usuarios totales" value={String(stats.totalUsers)} />
        <StatCard
          icon={CheckCircle2}
          label="Perfiles completados"
          value={String(stats.onboarded)}
          tone="accent"
        />
        <StatCard
          icon={Bookmark}
          label="Oportunidades guardadas"
          value={String(stats.guardadas)}
          tone="amber"
        />
        <StatCard
          icon={Wallet}
          label="Recaudación total"
          value={fmtCLP(stats.recaudado)}
          tone="accent"
        />
      </div>

      {/* Sincronización con Mercado Público */}
      <div className="card mt-6 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Radio size={16} className="text-accent-600" /> Sincronización con Mercado Público
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Abiertas en catálogo</dt>
            <dd className="num mt-0.5 text-lg font-bold text-ink">{nf.format(catalogo.abiertas)}</dd>
            <dd className="text-xs text-muted">
              {nf.format(catalogo.licitaciones)} licitaciones · {nf.format(catalogo.comprasAgiles)} compras ágiles
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Licitaciones sin detalle aún</dt>
            <dd className="num mt-0.5 text-lg font-bold text-ink">{nf.format(catalogo.pendientesDetalle)}</dd>
            <dd className="text-xs text-muted">{nf.format(sync.detalles)} enriquecidas desde el último reinicio</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Lista de licitaciones</dt>
            <dd className="mt-0.5 font-semibold text-ink">{hora(sync.listaAt)}</dd>
            <dd className="text-xs text-muted">Compras ágiles: {hora(sync.caAt)} · completo {hora(sync.caCompletoAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Errores</dt>
            <dd className="num mt-0.5 text-lg font-bold text-ink">{sync.errores}</dd>
            <dd className="line-clamp-2 text-xs text-muted">{sync.ultimoError ?? "Sin errores"}</dd>
          </div>
        </dl>
        {!sync.iniciado && (
          <p className="mt-3 text-xs text-amber-600">La sincronización no está activa en este proceso (falta ticket o DATABASE_URL).</p>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Distribución por plan */}
        <div className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-4 font-semibold text-ink">Usuarios por plan</h2>
          <div className="space-y-3">
            {PLANES.map((p, i) => {
              const c = stats.porPlan.find((x) => x.plan === p.id)?.total ?? 0;
              const pct = Math.round((c / totalPlan) * 100);
              return (
                <div key={p.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{p.nombre}</span>
                    <span className="text-muted">
                      {c} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className={`h-full ${colores[i % colores.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Usuarios recientes */}
        <div className="rounded-2xl border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold text-ink">Usuarios recientes</h2>
            <Link
              href="/admin/usuarios"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {usuarios.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{u.nombre}</p>
                  <p className="truncate text-xs text-muted">{u.email}</p>
                </div>
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
                  {u.plan}
                </span>
              </li>
            ))}
            {usuarios.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-muted">
                Aún no hay usuarios.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
