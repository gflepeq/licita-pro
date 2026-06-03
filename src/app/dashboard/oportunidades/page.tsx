import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, FileSearch } from "lucide-react";
import { PageHeader, EstadoBadge, ScoreBadge } from "@/components/dashboard/ui";
import { currentUser } from "@/lib/current-user";
import { listSaved } from "@/lib/db";
import { diasRestantes, fmtCLP, fmtFecha, type Licitacion } from "@/lib/data";

export default async function OportunidadesPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const guardadas = (await listSaved(user.id)) as Licitacion[];

  return (
    <div>
      <PageHeader
        title="Oportunidades guardadas"
        subtitle="Las licitaciones que marcaste para hacer seguimiento."
      />

      {guardadas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card py-16 text-center">
          <p className="text-sm text-muted">Aún no has guardado oportunidades.</p>
          <Link
            href="/dashboard/licitaciones"
            className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Explorar licitaciones
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {guardadas.map((l) => {
            const dias = l.cierre ? diasRestantes(l.cierre) : null;
            return (
              <div
                key={l.codigo}
                className="flex flex-col rounded-2xl border border-line bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <ScoreBadge score={l.score} />
                  <Bookmark size={18} className="fill-brand-600 text-brand-600" />
                </div>
                <p className="mt-3 font-semibold text-ink">{l.nombre}</p>
                <p className="mt-1 text-sm text-muted">
                  {l.organismo} · {l.codigo}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted">Monto estimado</p>
                    <p className="font-semibold text-ink">
                      {l.monto > 0 ? fmtCLP(l.monto) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Cierre</p>
                    <p className="font-semibold text-ink">
                      {l.cierre ? fmtFecha(l.cierre) : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <EstadoBadge estado={l.estado} />
                  {l.estado === "Publicada" && dias !== null && (
                    <span
                      className={`text-xs font-medium ${
                        dias <= 3 ? "text-red-600" : "text-muted"
                      }`}
                    >
                      {dias > 0 ? `Cierra en ${dias} días` : "Cierra hoy"}
                    </span>
                  )}
                </div>

                <Link
                  href="/dashboard/analisis"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-line py-2.5 text-sm font-semibold text-ink hover:bg-surface"
                >
                  <FileSearch size={16} /> Analizar bases con IA
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
