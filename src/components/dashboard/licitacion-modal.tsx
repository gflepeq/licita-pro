"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  CalendarClock,
  CalendarPlus,
  ExternalLink,
  FileSearch,
  FileText,
  Hourglass,
  Mail,
  MapPin,
  Package,
  Sparkles,
  Tag,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { EstadoBadge, ScoreRing } from "@/components/dashboard/ui";
import { compraAgilDetalleAction, licitacionDetalleAction } from "@/lib/actions/detalle";
import { fmtCLP, fmtFecha, fmtMonto, textoCierre, type Licitacion } from "@/lib/data";
import type { CompraAgilDetalle, LicitacionDetalle } from "@/lib/mercadopublico";

type Detalle =
  | { kind: "lic"; data: LicitacionDetalle }
  | { kind: "ca"; data: CompraAgilDetalle }
  | null;

// Archivo .ics para agendar el cierre en el calendario.
function icsHref(l: Licitacion): string {
  const d = l.cierre.replace(/-/g, "");
  const hora = (l.cierreHora || "15:00").replace(":", "") + "00";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LiciApp//ES",
    "BEGIN:VEVENT",
    `UID:${l.codigo}@liciapp.cl`,
    `DTSTART;TZID=America/Santiago:${d}T${hora}`,
    `DURATION:PT30M`,
    `SUMMARY:Cierre ${l.tipo}: ${l.nombre.replace(/[,;]/g, " ")}`,
    `DESCRIPTION:${l.codigo} · ${l.organismo.replace(/[,;]/g, " ")}`,
    `URL:${l.url ?? ""}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Cierra mañana",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

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
  const [detalle, setDetalle] = useState<Detalle>(null);
  const [loading, setLoading] = useState(false);

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

  // Detalle completo desde la API (lazy).
  useEffect(() => {
    if (!licitacion) return;
    let cancel = false;
    /* eslint-disable react-hooks/set-state-in-effect -- carga asíncrona al abrir */
    setDetalle(null);
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const p =
      licitacion.tipo === "Compra Ágil"
        ? compraAgilDetalleAction(licitacion.codigo).then((d) => (d ? ({ kind: "ca", data: d } as const) : null))
        : licitacionDetalleAction(licitacion.codigo).then((d) => (d ? ({ kind: "lic", data: d } as const) : null));
    p.then((d) => !cancel && setDetalle(d))
      .catch(() => {})
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [licitacion]);

  if (!licitacion) return null;
  const det = detalle?.kind === "lic" ? detalle.data : null;
  const ca = detalle?.kind === "ca" ? detalle.data : null;

  // Los datos del detalle (si llegaron) tienen prioridad sobre los del listado.
  const l: Licitacion = det
    ? {
        ...licitacion,
        organismo: det.organismo || licitacion.organismo,
        region: det.region !== "—" ? det.region : licitacion.region,
        monto: det.montoVisible ? det.monto : licitacion.monto,
        moneda: det.moneda,
        cierre: det.cierre || licitacion.cierre,
        cierreHora: det.cierreHora || licitacion.cierreHora,
        estado: det.estado,
        categoria: det.tipo,
      }
    : licitacion;
  const url = det?.url ?? l.url;
  const abierta = l.estado === "Publicada" && !!l.cierre && textoCierre(l.cierre).startsWith("Cierra");
  const descripcion = ca?.descripcion || det?.descripcion || (l.tipo === "Licitación" ? l.descripcion?.split("\n")[0] : "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
    >
      <div
        className="flex max-h-[94vh] w-full max-w-3xl animate-fade-in flex-col overflow-hidden rounded-t-3xl border border-line bg-card shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-line px-5 py-4 sm:px-6">
          <ScoreRing score={l.score} size={52} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <EstadoBadge estado={l.estado} />
              <span className="chip bg-subtle text-muted">{l.tipo}</span>
              <span className="font-mono text-xs text-muted">{l.codigo}</span>
            </div>
            <h2 id="modal-titulo" className="font-display text-lg font-bold leading-snug text-ink">
              {l.nombre}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-subtle hover:text-ink"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin sm:px-6">
          {l.rubrosMatch && l.rubrosMatch.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl bg-emerald-500/5 px-3 py-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Sparkles size={13} /> Coincide con tus rubros:
              </span>
              {l.rubrosMatch.map((r) => (
                <span key={r} className="chip bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  {r}
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field icon={Building2} label="Organismo" value={l.organismo || (loading ? "Cargando…" : "No informado")} sub={det?.unidad} />
            <Field
              icon={MapPin}
              label="Región"
              value={l.region !== "—" ? l.region : loading ? "Cargando…" : "No informada"}
              sub={det?.comuna}
            />
            <Field icon={Wallet} label="Monto estimado" value={fmtMonto(l.monto, l.moneda)} sub={det?.fuenteFinanciamiento} />
            <Field
              icon={CalendarClock}
              label="Cierre de ofertas"
              value={l.cierre ? `${fmtFecha(l.cierre)}${l.cierreHora ? ` · ${l.cierreHora} h` : ""}` : "—"}
              sub={l.cierre ? textoCierre(l.cierre, l.cierreHora) : undefined}
              highlight={abierta}
            />
            <Field icon={Tag} label="Modalidad" value={l.categoria} />
            {det?.contrato && <Field icon={Hourglass} label="Duración del contrato" value={det.contrato} />}
            {ca?.plazoEntregaDias != null && (
              <Field icon={Truck} label="Plazo de entrega" value={`${ca.plazoEntregaDias} días`} sub={ca.direccionEntrega} />
            )}
          </div>

          {loading && (
            <div className="mt-5 space-y-2">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-5/6" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          )}

          {descripcion && (
            <Section title="Descripción" icon={FileText}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{descripcion}</p>
            </Section>
          )}

          {/* Cronograma */}
          {det && det.fechas.length > 0 && (
            <Section title="Cronograma" icon={CalendarClock}>
              <ol className="relative ml-1 space-y-3 border-l border-line pl-5">
                {det.fechas.map((f) => {
                  const pasada = f.fecha < new Date().toISOString().slice(0, 10);
                  return (
                    <li key={f.label} className="relative">
                      <span
                        className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-card ${
                          f.label === "Cierre de ofertas" ? "bg-brand-600" : pasada ? "bg-line" : "bg-emerald-500"
                        }`}
                      />
                      <p className={`text-sm ${f.label === "Cierre de ofertas" ? "font-semibold text-ink" : "text-ink"}`}>
                        {f.label}
                      </p>
                      <p className="text-xs text-muted">
                        {fmtFecha(f.fecha)}
                        {f.hora ? ` · ${f.hora} h` : ""}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </Section>
          )}

          {/* Ítems / productos */}
          {(det?.items.length || ca?.productos.length) ? (
            <Section title={det ? `Ítems solicitados (${det.items.length})` : "Productos solicitados"} icon={Package}>
              <ul className="space-y-2">
                {(det?.items ?? []).slice(0, 25).map((it) => (
                  <li key={it.correlativo} className="rounded-xl bg-surface px-3.5 py-2.5 text-sm">
                    <p className="font-medium text-ink">
                      <span className="tabular-nums text-muted">{it.cantidad.toLocaleString("es-CL")} {it.unidad} ·</span>{" "}
                      {it.producto}
                    </p>
                    {it.descripcion && <p className="mt-0.5 text-xs text-muted">{it.descripcion}</p>}
                    {it.adjudicacion && (
                      <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Adjudicado a {it.adjudicacion.proveedor} ·{" "}
                        {fmtCLP(it.adjudicacion.cantidad * it.adjudicacion.montoUnitario)}
                      </p>
                    )}
                  </li>
                ))}
                {(ca?.productos ?? []).map((p, i) => (
                  <li key={i} className="rounded-xl bg-surface px-3.5 py-2.5 text-sm">
                    <p className="font-medium text-ink">
                      <span className="tabular-nums text-muted">{p.cantidad.toLocaleString("es-CL")} {p.unidad} ·</span> {p.nombre}
                    </p>
                    {p.descripcion && <p className="mt-0.5 text-xs text-muted">{p.descripcion}</p>}
                  </li>
                ))}
              </ul>
              {det && det.items.length > 25 && (
                <p className="mt-2 text-xs text-muted">Y {det.items.length - 25} ítems más en la ficha oficial.</p>
              )}
            </Section>
          ) : null}

          {/* Adjudicación */}
          {det?.adjudicacion && (
            <Section title="Adjudicación" icon={Users}>
              <p className="text-sm text-ink">
                {det.adjudicacion.oferentes > 0 && <>{det.adjudicacion.oferentes} oferentes · </>}
                {det.adjudicacion.fecha && <>Resolución del {fmtFecha(det.adjudicacion.fecha)}</>}
              </p>
              {det.adjudicacion.urlActa && (
                <a href={det.adjudicacion.urlActa} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                  Ver acta de adjudicación <ExternalLink size={13} />
                </a>
              )}
            </Section>
          )}

          {/* Documentos de compra ágil */}
          {ca && ca.documentos.length > 0 && (
            <Section title="Documentos" icon={FileText}>
              <ul className="space-y-1.5">
                {ca.documentos.map((d) => (
                  <li key={d.url}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                      <FileText size={14} /> {d.nombre}
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Contacto */}
          {det && (det.responsable.nombre || det.responsable.email) && (
            <Section title="Responsable del contrato" icon={Mail}>
              <p className="text-sm text-ink">{det.responsable.nombre}</p>
              {det.responsable.email && (
                <a href={`mailto:${det.responsable.email}`} className="text-sm text-brand-600 hover:underline">
                  {det.responsable.email}
                </a>
              )}
            </Section>
          )}

          {!loading && !detalle && l.tipo === "Licitación" && !l.enriquecida && (
            <p className="mt-5 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              No pudimos obtener el detalle desde Mercado Público en este momento. Revisa la ficha oficial.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface/60 px-5 py-3.5 sm:px-6">
          {onToggleSaved && (
            <button onClick={() => onToggleSaved(l)} className="btn-secondary">
              <Bookmark size={16} className={saved ? "fill-brand-600 text-brand-600" : ""} />
              {saved ? "Guardada" : "Guardar"}
            </button>
          )}
          {abierta && (
            <a href={icsHref(l)} download={`cierre-${l.codigo}.ics`} className="btn-ghost" title="Agregar el cierre a tu calendario">
              <CalendarPlus size={16} /> <span className="hidden sm:inline">Agendar cierre</span>
            </a>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <ExternalLink size={16} />
                <span className="sm:hidden">Ficha</span>
                <span className="hidden sm:inline">Ficha en Mercado Público</span>
              </a>
            )}
            <Link href={`/dashboard/analisis?codigo=${encodeURIComponent(l.codigo)}`} className="btn-primary">
              <FileSearch size={16} /> Analizar con IA
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="eyebrow mb-2.5 flex items-center gap-1.5">
        <Icon size={13} /> {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${highlight ? "border-brand-200 bg-brand-50" : "border-line bg-surface"}`}>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-card text-brand-600 shadow-card">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-semibold text-ink">{value}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
}
