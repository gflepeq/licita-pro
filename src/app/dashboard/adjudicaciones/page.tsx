import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, CheckCircle2, FileText, Receipt, Building2 } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/ui";
import { fmtCLP, fmtFecha } from "@/lib/data";
import { currentUser } from "@/lib/current-user";
import { getAdjudicacionesByRut } from "@/lib/mercadopublico";

export const dynamic = "force-dynamic";

export default async function AdjudicacionesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const data = await getAdjudicacionesByRut(user.rut);

  return (
    <div>
      <PageHeader
        title="Adjudicaciones"
        subtitle={
          user.rut
            ? `Órdenes de compra reales asociadas al RUT ${user.rut} en Mercado Público.`
            : "Resultados reales de tus compras públicas."
        }
      />

      {data.source === "sin-rut" ? (
        <EmptyState
          icon={Building2}
          title="Falta el RUT de tu empresa"
          texto="Agrega el RUT de tu empresa en Configuración para traer tus órdenes de compra reales desde Mercado Público."
          cta={{ href: "/dashboard/configuracion", label: "Ir a Configuración" }}
        />
      ) : data.source === "error" ? (
        <EmptyState
          icon={FileText}
          title="No pudimos cargar tus adjudicaciones"
          texto={data.note ?? "Inténtalo nuevamente en unos minutos."}
        />
      ) : data.total === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Aún no registramos adjudicaciones"
          texto={`No encontramos órdenes de compra en Mercado Público para el RUT ${user.rut}.`}
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Trophy}
              label="Órdenes de compra"
              value={String(data.total)}
              tone="accent"
            />
            <StatCard
              icon={Receipt}
              label={`Monto adjudicado (últimas ${data.enriched})`}
              value={fmtCLP(data.montoTotal)}
              tone="accent"
            />
            <StatCard
              icon={CheckCircle2}
              label="Mostrando"
              value={`${data.items.length} de ${data.total}`}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-semibold text-ink">Órdenes de compra recientes</h2>
              <span className="text-xs text-muted">
                Actualizado {fmtFecha(data.fetchedAt.slice(0, 10))}
              </span>
            </div>
            <ul className="divide-y divide-line">
              {data.items.map((a) => (
                <li
                  key={a.codigo}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-600">
                      <Trophy size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{a.nombre || a.codigo}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {a.organismo}
                        {a.region !== "—" ? ` · ${a.region}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        OC <span className="font-medium text-ink">{a.codigo}</span>
                        {a.codigoLicitacion ? ` · Licitación ${a.codigoLicitacion}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pl-13 sm:pl-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink">
                        {a.monto ? fmtCLP(a.monto) : "—"}
                      </p>
                      <p className="text-xs text-muted">{a.fecha ? fmtFecha(a.fecha) : ""}</p>
                    </div>
                    <span className="rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-semibold text-accent-600">
                      {a.estado}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {data.total > data.items.length && (
            <p className="mt-4 text-center text-xs text-muted">
              Mostrando las {data.items.length} más recientes con detalle de monto. Tu RUT
              registra {data.total} órdenes de compra en total.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  texto,
  cta,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  texto: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-line bg-card px-6 py-14 text-center">
      <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-surface text-muted">
        <Icon size={22} />
      </span>
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{texto}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
