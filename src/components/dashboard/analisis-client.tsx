"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ExternalLink,
  Lightbulb,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { CierreBadge, TipoBadge } from "@/components/dashboard/ui";
import { analizarAction, preguntarAction } from "@/lib/actions/ia";
import { fmtCLPCorto, type Licitacion } from "@/lib/data";
import type { Analisis, Turno } from "@/lib/ia";

export function AnalisisClient({ licitacion: l, disponible }: { licitacion: Licitacion; disponible: boolean }) {
  const [a, setA] = useState<Analisis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(disponible);
  const [chat, setChat] = useState<Turno[]>([]);
  const [input, setInput] = useState("");
  const [pensando, setPensando] = useState(false);
  const finChat = useRef<HTMLDivElement>(null);

  const pedir = () =>
    analizarAction(l.codigo)
      .then((r) => (r.ok ? setA(r.data) : setError(r.error)))
      .catch(() => setError("No se pudo conectar. Intenta nuevamente."))
      .finally(() => setCargando(false));

  // Reintento manual.
  const analizar = () => {
    setCargando(true);
    setError(null);
    void pedir();
  };

  // Primera carga (el estado inicial ya es "cargando").
  useEffect(() => {
    if (disponible) void pedir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l.codigo, disponible]);

  useEffect(() => {
    finChat.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat, pensando]);

  const enviar = (texto: string) => {
    const q = texto.trim();
    if (!q || pensando) return;
    const historial = chat;
    setChat((c) => [...c, { rol: "user", txt: q }]);
    setInput("");
    setPensando(true);
    preguntarAction(l.codigo, historial, q)
      .then((r) => setChat((c) => [...c, { rol: "ia", txt: r.ok ? r.data : r.error }]))
      .catch(() => setChat((c) => [...c, { rol: "ia", txt: "No se pudo conectar. Intenta nuevamente." }]))
      .finally(() => setPensando(false));
  };

  const tono =
    !a ? "" : a.viabilidad >= 70 ? "text-accent-600" : a.viabilidad >= 45 ? "text-amber-600" : "text-red-600";
  const anillo =
    !a ? "" : a.viabilidad >= 70 ? "stroke-accent-500" : a.viabilidad >= 45 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <div>
      <Link
        href="/dashboard/analisis"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Elegir otra oportunidad
      </Link>

      {/* Ficha */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <TipoBadge tipo={l.tipo} tipoLic={l.tipoLic} />
          <span className="font-mono text-xs text-muted">{l.codigo}</span>
          <CierreBadge cierre={l.cierre} cierreHora={l.cierreHora} />
        </div>
        <h1 className="mt-2 text-xl font-bold leading-snug tracking-tight text-ink sm:text-2xl">{l.nombre}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Building2 size={14} /> {l.organismo}
          </span>
          <span className="num font-semibold text-ink">{l.monto > 0 ? fmtCLPCorto(l.monto) : "Monto no publicado"}</span>
          {l.url && (
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600">
              Ficha oficial <ExternalLink size={13} />
            </a>
          )}
        </div>
      </div>

      {!disponible ? (
        <div className="card mt-5 p-6 text-sm text-muted">
          El análisis con IA se activará cuando el administrador configure la clave de la API de Claude en el servidor
          (variable <code className="rounded bg-surface px-1">ANTHROPIC_API_KEY</code>).
        </div>
      ) : cargando && !a ? (
        <div className="card mt-5 flex flex-col items-center px-6 py-14 text-center">
          <Loader2 size={28} className="animate-spin text-brand-600" />
          <p className="mt-4 font-semibold text-ink">Analizando la oportunidad para tu empresa…</p>
          <p className="mt-1 text-sm text-muted">Revisamos productos, plazos y el organismo. Toma unos segundos.</p>
        </div>
      ) : error ? (
        <div className="card mt-5 flex flex-col items-center px-6 py-10 text-center">
          <AlertTriangle size={26} className="text-amber-500" />
          <p className="mt-3 font-semibold text-ink">{error}</p>
          <button
            onClick={analizar}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      ) : a ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* Veredicto */}
            <div className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="relative grid h-28 w-28 shrink-0 place-items-center self-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-line" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(a.viabilidad / 100) * 97.4} 97.4`}
                    className={anillo}
                  />
                </svg>
                <div className="text-center">
                  <p className={`num text-3xl font-bold ${tono}`}>{a.viabilidad}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">viabilidad</p>
                </div>
              </div>
              <div>
                <p className={`text-sm font-bold uppercase tracking-wide ${tono}`}>{a.veredicto}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink">{a.resumen}</p>
                <ul className="mt-3 space-y-1">
                  {a.razones.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink/80">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Requisitos */}
            <section className="card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <ClipboardCheck size={17} className="text-brand-600" /> Requisitos y documentos probables
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {a.requisitos.map((r, i) => (
                  <li key={i} className="py-2.5">
                    <p className="text-sm font-medium text-ink">{r.requisito}</p>
                    {r.detalle && <p className="text-xs text-muted">{r.detalle}</p>}
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid gap-5 sm:grid-cols-2">
              <section className="card p-5">
                <h2 className="flex items-center gap-2 font-semibold text-ink">
                  <AlertTriangle size={17} className="text-amber-500" /> Riesgos a revisar
                </h2>
                <ul className="mt-3 space-y-2">
                  {a.riesgos.map((r, i) => (
                    <li key={i} className="text-sm text-ink/80">
                      · {r}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="card p-5">
                <h2 className="flex items-center gap-2 font-semibold text-ink">
                  <CalendarClock size={17} className="text-brand-600" /> Hitos
                </h2>
                <ul className="mt-3 space-y-2">
                  {a.fechas.map((f, i) => (
                    <li key={i} className="flex justify-between gap-3 text-sm">
                      <span className="text-ink/80">{f.hito}</span>
                      <span className="num shrink-0 font-semibold text-ink">{f.fecha}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="card bg-brand-600/[0.03] p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-semibold text-ink">
                <Lightbulb size={17} className="text-brand-600" /> Cómo armar una oferta competitiva
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/85">{a.estrategia}</p>
            </section>
            <p className="text-xs text-muted">
              Análisis generado con IA a partir de los datos publicados en Mercado Público. Confirma siempre los
              requisitos en las bases oficiales.
            </p>
          </div>

          {/* Chat */}
          <aside className="card flex h-fit max-h-[640px] flex-col lg:sticky lg:top-20">
            <div className="border-b border-line px-4 py-3">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <Sparkles size={16} className="text-brand-600" /> Pregúntale a la IA
              </p>
              <p className="text-xs text-muted">Sobre esta oportunidad y tu empresa.</p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {chat.length === 0 &&
                a.preguntas.map((p) => (
                  <button
                    key={p}
                    onClick={() => enviar(p)}
                    className="block w-full rounded-xl border border-line px-3 py-2 text-left text-sm text-ink/80 hover:border-brand-600/40 hover:bg-surface"
                  >
                    {p}
                  </button>
                ))}
              {chat.map((t, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm ${
                    t.rol === "user" ? "ml-auto bg-brand-600 text-white" : "bg-surface text-ink"
                  }`}
                >
                  {t.txt}
                </div>
              ))}
              {pensando && (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 text-sm text-muted">
                  <Loader2 size={14} className="animate-spin" /> Pensando…
                </div>
              )}
              <div ref={finChat} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar(input);
              }}
              className="flex gap-2 border-t border-line p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta…"
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={pensando || !input.trim()}
                className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white disabled:opacity-50"
                aria-label="Enviar"
              >
                <Send size={15} />
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
