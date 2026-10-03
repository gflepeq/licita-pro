"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  CalendarClock,
  ExternalLink,
  FileSearch,
  Loader2,
  MapPin,
  Package,
  Sparkles,
  Tag,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { CierreBadge, EstadoBadge, ScoreBadge, TipoBadge } from "@/components/dashboard/ui";
import { compraAgilDetalleAction, oportunidadDetalleAction } from "@/lib/actions/detalle";
import { fmtCLP, fmtFecha, type Licitacion } from "@/lib/data";

interface CADetalle {
  descripcion: string;
  plazoEntregaDias: number | null;
  direccionEntrega: string;
  productos: { nombre: string; descripcion: string; cantidad: number; unidad: string }[];
  documentos: { nombre: string; url: string }[];
}

type Producto = { nombre: string; descripcion: string; cantidad: number; unidad: string; categoria?: string };

const nf = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

export function LicitacionModal({
  licitacion,
  saved,
  onToggleSaved,
  onClose,
}: {
  licitacion: Licitacion | null;
  saved?: boolean;
  onToggleSaved?: (l: Licitacion) => void;
  onClose: () => void;
}) {
  // Detalle cargado para un código; si no coincide con la licitación abierta, está cargando.
  const [det, setDet] = useState<{ codigo: string; full: Licitacion | null; ca: CADetalle | null } | null>(null);

  useEffect(() => {
    if (!licitacion) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [licitacion, onClose]);

  // Detalle completo: ficha del catálogo (+ términos de referencia si es Compra Ágil).
  useEffect(() => {
    if (!licitacion) return;
    let cancel = false;
    const codigo = licitacion.codigo;
    Promise.all([
      oportunidadDetalleAction(codigo).catch(() => null),
      licitacion.tipo === "Compra Ágil" ? compraAgilDetalleAction(codigo).catch(() => null) : Promise.resolve(null),
    ]).then(([full, ca]) => {
      if (!cancel) setDet({ codigo, full, ca });
    });
    return () => {
      cancel = true;
    };
  }, [licitacion]);

  if (!licitacion) return null;
  const actual = det?.codigo === licitacion.codigo ? det : null;
  const loading = !actual;
  const full = actual?.full ?? null;
  const ca = actual?.ca ?? null;
  const l = { ...licitacion, ...(full ?? {}), score: licitacion.score, rubrosMatch: licitacion.rubrosMatch };
  const productos: Producto[] = ca?.productos.length ? ca.productos : (l.items ?? []);
  const descripcion = ca?.descripcion || l.descripcion;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={l.nombre}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-card shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-card/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <TipoBadge tipo={l.tipo} tipoLic={l.tipoLic} />
            <EstadoBadge estado={l.estado} />
            <ScoreBadge score={l.score} />
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <p className="font-mono text-xs text-muted">{l.codigo}</p>
          <h2 className="mt-1 text-lg font-bold leading-snug text-ink sm:text-xl">{l.nombre}</h2>
          <div className="mt-3">
            <CierreBadge cierre={l.cierre} cierreHora={l.cierreHora} />
          </div>

          {l.rubrosMatch && l.rubrosMatch.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-xl bg-accent-500/5 p-3">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600">
                <Sparkles size={13} /> Coincide con tus rubros:
              </span>
              {l.rubrosMatch.map((r) => (
                <span key={r} className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-semibold text-accent-600">
                  {r}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field
              icon={Building2}
              label="Organismo"
              value={l.organismo}
              sub={l.unidad && l.unidad !== l.organismo ? l.unidad : undefined}
            />
            <Field icon={MapPin} label="Región" value={l.region !== "—" ? l.region : "No informada"} />
            <Field
              icon={Wallet}
              label={l.tipo === "Compra Ágil" ? "Monto disponible" : "Monto estimado"}
              value={l.monto > 0 ? fmtCLP(l.monto) : "No publicado"}
            />
            <Field
              icon={CalendarClock}
              label="Cierre de ofertas"
              value={
                l.cierre
                  ? `${fmtFecha(l.cierre)}${l.cierreHora && l.cierreHora.length >= 16 ? ` · ${l.cierreHora.slice(11, 16)} h` : ""}`
                  : "—"
              }
              sub={l.publicada ? `Publicada el ${fmtFecha(l.publicada)}` : undefined}
            />
            {(l.categorias?.length ?? 0) > 0 && (
              <div className="sm:col-span-2">
                <Field icon={Tag} label="Categorías" value={l.categorias!.join(" · ")} />
              </div>
            )}
          </div>

          {descripcion && (
            <section className="mt-6">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Descripción</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{descripcion}</p>
            </section>
          )}

          {ca && (ca.plazoEntregaDias != null || ca.direccionEntrega) && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface p-3 text-sm text-ink/80">
              <Truck size={15} className="mt-0.5 shrink-0" />
              {ca.plazoEntregaDias != null ? `Entrega en ${ca.plazoEntregaDias} días` : ""}
              {ca.direccionEntrega ? ` · ${ca.direccionEntrega}` : ""}
            </p>
          )}

          <section className="mt-6">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <Package size={14} /> Productos y servicios solicitados
              {productos.length > 0 && <span className="num">({productos.length})</span>}
            </h3>
            {loading && !productos.length ? (
              <div className="space-y-2">
                <div className="skeleton h-12" />
                <div className="skeleton h-12" />
              </div>
            ) : productos.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {productos.slice(0, 30).map((p, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{p.nombre}</p>
                      {p.descripcion && p.descripcion !== p.nombre && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.descripcion}</p>
                      )}
                    </div>
                    {p.cantidad > 0 && (
                      <span className="num shrink-0 rounded-md bg-surface px-2 py-0.5 text-xs font-semibold text-ink/80">
                        {nf.format(p.cantidad)} {p.unidad}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                {l.enriquecida === false
                  ? "Estamos descargando el detalle desde Mercado Público; vuelve en unos minutos."
                  : "Revisa las bases en Mercado Público para ver el detalle."}
              </p>
            )}
            {productos.length > 30 && (
              <p className="mt-2 text-xs text-muted">Y {productos.length - 30} productos más en la ficha oficial.</p>
            )}
          </section>

          {ca?.documentos && ca.documentos.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Documentos</h3>
              <ul className="space-y-1">
                {ca.documentos.map((d, i) => (
                  <li key={i} className="text-sm text-ink/80">
                    · {d.nombre}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {loading && (
            <p className="mt-4 flex items-center gap-2 text-xs text-muted">
              <Loader2 size={13} className="animate-spin" /> Actualizando ficha…
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-card/95 px-5 py-4 backdrop-blur">
          <div className="flex gap-2">
            {onToggleSaved && (
              <button
                onClick={() => onToggleSaved(l)}
                className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
              >
                <Bookmark size={16} className={saved ? "fill-brand-600 text-brand-600" : ""} />
                {saved ? "Guardada" : "Guardar"}
              </button>
            )}
            {l.url && (
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
              >
                <ExternalLink size={16} /> Ficha oficial
              </a>
            )}
          </div>
          <Link
            href={`/dashboard/analisis?codigo=${encodeURIComponent(l.codigo)}`}
            className="inline-flex items-center gap-2 rounded-lg btn-ink px-4 py-2.5 text-sm font-semibold"
          >
            <FileSearch size={16} /> Analizar con IA
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface p-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600/10 text-brand-600">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-semibold text-ink">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}
