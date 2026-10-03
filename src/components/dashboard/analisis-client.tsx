"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FileText,
  Hash,
  Lightbulb,
  Loader2,
  RotateCcw,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/ui";
import type { Analisis } from "@/lib/ia";

type Fase = "vacio" | "analizando" | "listo";
type Msg = { rol: "user" | "ia"; txt: string };

const PASOS = [
  "Leyendo el documento…",
  "Extrayendo requisitos y certificados…",
  "Identificando plazos y garantías…",
  "Evaluando viabilidad para tu empresa…",
];

export function AnalisisClient({ codigoInicial = "", iaReal }: { codigoInicial?: string; iaReal: boolean }) {
  const [fase, setFase] = useState<Fase>("vacio");
  const [codigo, setCodigo] = useState(codigoInicial);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [paso, setPaso] = useState(0);
  const [res, setRes] = useState<{ analisis: Analisis; fileId?: string; ficha?: string; demo: boolean } | null>(null);
  const [chat, setChat] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pensando, setPensando] = useState(false);
  const inputFile = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const elegir = (f: File | undefined | null) => {
    setError("");
    if (!f) return;
    if (f.type !== "application/pdf") return setError("El archivo debe ser PDF.");
    if (f.size > 4 * 1024 * 1024) return setError("El PDF supera los 4 MB. Sube solo las bases administrativas y técnicas.");
    setFile(f);
  };

  const analizar = async () => {
    setError("");
    if (!file && !codigo.trim()) return setError("Sube el PDF de las bases o indica el código del proceso.");
    setFase("analizando");
    setPaso(0);
    const timer = setInterval(() => setPaso((p) => Math.min(p + 1, PASOS.length - 1)), 4000);
    try {
      const fd = new FormData();
      if (codigo.trim()) fd.set("codigo", codigo.trim());
      if (file) fd.set("pdf", file);
      const r = await fetch("/api/analisis", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({ error: "Respuesta inválida del servidor." }));
      if (!r.ok || data.error) throw new Error(data.error || "No se pudo analizar.");
      setRes(data);
      setChat([]);
      setFase("listo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo analizar.");
      setFase("vacio");
    } finally {
      clearInterval(timer);
    }
  };

  const enviar = async (texto: string) => {
    const t = texto.trim();
    if (!t || pensando || !res) return;
    const historial = chat;
    setChat((c) => [...c, { rol: "user", txt: t }]);
    setInput("");
    setPensando(true);
    try {
      const r = await fetch("/api/analisis/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId: res.fileId, ficha: res.ficha, historial, pregunta: t }),
      });
      const data = await r.json().catch(() => ({}));
      setChat((c) => [...c, { rol: "ia", txt: data.respuesta || data.error || "No pude responder." }]);
    } catch {
      setChat((c) => [...c, { rol: "ia", txt: "Error de conexión. Intenta nuevamente." }]);
    } finally {
      setPensando(false);
      setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  };

  const reiniciar = () => {
    setFase("vacio");
    setRes(null);
    setFile(null);
    setChat([]);
  };

  const a = res?.analisis;
  const colorViab = !a ? "" : a.viabilidad >= 70 ? "#10b981" : a.viabilidad >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <PageHeader
        title="Análisis de bases con IA"
        subtitle="Requisitos, plazos, criterios de evaluación y viabilidad de postular, en segundos."
        badge={
          !iaReal ? (
            <span className="chip bg-amber-500/10 text-amber-700 dark:text-amber-400">Modo demostración</span>
          ) : (
            <span className="chip bg-brand-50 text-brand-700 dark:text-brand-300">
              <Sparkles size={12} /> Claude
            </span>
          )
        }
        actions={
          fase === "listo" && (
            <button onClick={reiniciar} className="btn-secondary">
              <RotateCcw size={15} /> Nuevo análisis
            </button>
          )
        }
      />

      {fase === "vacio" && (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="card p-5 lg:col-span-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                elegir(e.dataTransfer.files?.[0]);
              }}
              onClick={() => inputFile.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                drag ? "border-brand-500 bg-brand-50" : "border-brand-200 bg-brand-50/40 hover:bg-brand-50"
              }`}
            >
              <input ref={inputFile} type="file" accept="application/pdf" hidden onChange={(e) => elegir(e.target.files?.[0])} />
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <Upload size={24} />
              </span>
              {file ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-medium text-ink shadow-card">
                  <FileText size={16} className="text-brand-600" /> {file.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-muted hover:text-red-600"
                    aria-label="Quitar archivo"
                  >
                    <X size={15} />
                  </button>
                </span>
              ) : (
                <>
                  <span className="font-semibold text-ink">Arrastra el PDF de las bases o haz clic para subir</span>
                  <span className="text-sm text-muted">PDF de hasta 4 MB (bases administrativas y técnicas)</span>
                </>
              )}
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> y/o <span className="h-px flex-1 bg-line" />
            </div>

            <label className="block">
              <span className="text-sm font-medium text-ink">Código del proceso en Mercado Público</span>
              <div className="relative mt-1.5">
                <Hash size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="ej. 1057-412-LR26"
                  className="input pl-10 font-mono"
                />
              </div>
              <span className="mt-1.5 block text-xs text-muted">
                Usamos la ficha oficial (ítems, fechas, monto) para complementar el análisis.
              </span>
            </label>

            {error && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle size={16} /> {error}
              </p>
            )}

            <button onClick={analizar} className="btn-primary mt-5 w-full py-3">
              <Sparkles size={16} /> Analizar con IA
            </button>
          </div>

          <div className="card p-5 lg:col-span-2">
            <h2 className="font-semibold text-ink">Qué obtienes</h2>
            <ul className="mt-4 space-y-3.5 text-sm">
              {[
                [Scale, "Viabilidad de postular", "Puntaje según el perfil de tu empresa."],
                [FileCheck2, "Requisitos y certificados", "Qué cumples, qué verificar y qué es riesgoso."],
                [CalendarClock, "Plazos clave", "Consultas, cierre, apertura y adjudicación."],
                [ShieldCheck, "Garantías y multas", "Seriedad, fiel cumplimiento y sanciones."],
                [Lightbulb, "Recomendaciones", "Cómo mejorar tu puntaje en la evaluación."],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof Scale;
                return (
                  <li key={t as string} className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <I size={16} />
                    </span>
                    <div>
                      <p className="font-medium text-ink">{t as string}</p>
                      <p className="text-muted">{d as string}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {fase === "analizando" && (
        <div className="card flex flex-col items-center justify-center gap-4 py-20">
          <div className="relative grid h-16 w-16 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-white">
              <Sparkles size={24} />
            </span>
          </div>
          <p className="font-medium text-ink">{PASOS[paso]}</p>
          <p className="text-xs text-muted">Esto puede tomar hasta un minuto en bases extensas.</p>
          <div className="mt-2 flex gap-1.5">
            {PASOS.map((_, i) => (
              <span key={i} className={`h-1.5 w-8 rounded-full ${i <= paso ? "bg-brand-600" : "bg-subtle"}`} />
            ))}
          </div>
        </div>
      )}

      {fase === "listo" && a && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {res?.demo && (
              <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                Resultado de ejemplo. El administrador debe configurar ANTHROPIC_API_KEY para analizar tus bases reales.
              </p>
            )}

            {/* Viabilidad */}
            <div className="card p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div
                  className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(${colorViab} ${a.viabilidad * 3.6}deg, var(--subtle) 0)` }}
                >
                  <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-card">
                    <span className="font-display text-2xl font-bold text-ink">{a.viabilidad}</span>
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Viabilidad para postular</p>
                  <h2 className="mt-0.5 font-display text-xl font-bold text-ink">{a.nivel}</h2>
                  <p className="mt-0.5 text-sm font-medium text-muted">{a.titulo}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink">{a.resumen}</p>
                </div>
              </div>
            </div>

            <Panel title="Requisitos y certificados" icon={FileCheck2}>
              <ul className="space-y-2.5">
                {a.requisitos.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {r.estado === "cumple" ? (
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
                    ) : r.estado === "riesgo" ? (
                      <ShieldAlert size={18} className="mt-0.5 shrink-0 text-red-500" />
                    ) : (
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
                    )}
                    <span className="text-ink">
                      {r.texto}
                      {r.estado !== "cumple" && (
                        <span
                          className={`chip ml-2 ${
                            r.estado === "riesgo"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {r.estado === "riesgo" ? "Riesgo" : "Por verificar"}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="grid gap-5 md:grid-cols-2">
              <Panel title="Plazos clave" icon={CalendarClock}>
                <ul className="space-y-2.5">
                  {a.plazos.map((p, i) => (
                    <li key={i} className="rounded-xl bg-surface px-3 py-2">
                      <p className="text-xs text-muted">{p.hito}</p>
                      <p className="text-sm font-semibold text-ink">{p.fecha}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Criterios de evaluación" icon={Scale}>
                <ul className="space-y-3">
                  {a.criterios.map((c, i) => {
                    const pct = parseFloat(c.ponderacion);
                    return (
                      <li key={i}>
                        <div className="mb-1 flex justify-between gap-2 text-sm">
                          <span className="text-ink">{c.criterio}</span>
                          <span className="font-semibold tabular-nums text-ink">{c.ponderacion}</span>
                        </div>
                        {!isNaN(pct) && (
                          <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
                            <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            </div>

            {(a.garantias.length > 0 || a.riesgos.length > 0) && (
              <div className="grid gap-5 md:grid-cols-2">
                <Lista title="Garantías" icon={ShieldCheck} items={a.garantias} />
                <Lista title="Riesgos y multas" icon={ShieldAlert} items={a.riesgos} />
              </div>
            )}
            <Lista title="Recomendaciones para tu oferta" icon={Lightbulb} items={a.recomendaciones} />
          </div>

          {/* Asistente IA */}
          <div className="card flex h-fit flex-col lg:sticky lg:top-24">
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white">
                <Sparkles size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Asistente de bases</p>
                <p className="text-xs text-muted">Pregunta lo que necesites</p>
              </div>
            </div>

            <div className="flex max-h-[420px] min-h-40 flex-col gap-3 overflow-y-auto p-4 scrollbar-thin">
              <div className="max-w-[90%] rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-sm text-ink">
                Ya revisé el proceso. Pregúntame sobre requisitos, plazos, garantías o criterios de evaluación.
              </div>
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[90%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.rol === "ia" ? "rounded-tl-md bg-surface text-ink" : "ml-auto rounded-tr-md bg-brand-600 text-white"
                  }`}
                >
                  {m.txt}
                </div>
              ))}
              {pensando && (
                <div className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-sm text-muted">
                  <Loader2 size={14} className="animate-spin" /> Pensando…
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            {chat.length === 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                {a.preguntas.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="rounded-full border border-line px-3 py-1 text-left text-xs text-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar(input);
              }}
              className="flex items-center gap-2 border-t border-line p-3"
            >
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu pregunta…" className="input py-2" />
              <button type="submit" disabled={pensando} className="btn-primary h-10 w-10 shrink-0 p-0" aria-label="Enviar">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Lista({ title, icon, items }: { title: string; icon: React.ElementType; items: string[] }) {
  if (!items.length) return null;
  return (
    <Panel title={title} icon={icon}>
      <ul className="space-y-2">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
            {t}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
