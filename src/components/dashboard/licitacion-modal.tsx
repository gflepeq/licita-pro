"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  CalendarClock,
  ExternalLink,
  FileSearch,
  MapPin,
  Sparkles,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { EstadoBadge, ScoreBadge } from "@/components/dashboard/ui";
import {
  diasRestantes,
  fmtCLP,
  fmtFecha,
  type Licitacion,
} from "@/lib/data";

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

  if (!licitacion) return null;
  const l = licitacion;
  const dias = l.cierre ? diasRestantes(l.cierre) : null;
  const esLicitacion = l.tipo === "Licitación";
  const fichaUrl = esLicitacion
    ? `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(
        l.codigo
      )}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-line bg-card/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <ScoreBadge score={l.score} />
            <EstadoBadge estado={l.estado} />
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
              {l.tipo}
            </span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <h2 className="text-lg font-bold leading-snug text-ink">{l.nombre}</h2>
          <p className="mt-1 font-mono text-xs text-muted">{l.codigo}</p>

          {l.rubrosMatch && l.rubrosMatch.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-600">
                <Sparkles size={13} /> Coincide con tus rubros:
              </span>
              {l.rubrosMatch.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-semibold text-accent-600"
                >
                  {r}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field icon={Building2} label="Organismo" value={l.organismo} />
            <Field icon={MapPin} label="Región" value={l.region !== "—" ? l.region : "No informada"} />
            <Field
              icon={Wallet}
              label="Monto estimado"
              value={l.monto > 0 ? fmtCLP(l.monto) : "No publicado"}
            />
            <Field icon={Tag} label="Categoría" value={l.categoria} />
            <Field
              icon={CalendarClock}
              label={l.tipo === "Compra Ágil" ? "Fecha" : "Cierre de ofertas"}
              value={
                l.cierre
                  ? `${fmtFecha(l.cierre)}${
                      l.estado === "Publicada" && dias !== null
                        ? dias > 0
                          ? ` · ${dias} días`
                          : " · hoy"
                        : ""
                    }`
                  : "—"
              }
            />
          </div>

          {l.descripcion && (
            <div className="mt-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {esLicitacion ? "Descripción" : "Términos de referencia"}
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                {l.descripcion}
              </p>
            </div>
          )}

          {fichaUrl && (
            <a
              href={fichaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-300"
            >
              <ExternalLink size={16} /> Ver bases y adjuntos en Mercado Público
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-card/95 px-5 py-4 backdrop-blur">
          {onToggleSaved ? (
            <button
              onClick={() => onToggleSaved(l)}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
            >
              <Bookmark
                size={16}
                className={saved ? "fill-brand-600 text-brand-600" : ""}
              />
              {saved ? "Guardada" : "Guardar"}
            </button>
          ) : (
            <span />
          )}
          <Link
            href="/dashboard/analisis"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
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
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface p-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
