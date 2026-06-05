"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/ui";

type Fase = "vacio" | "analizando" | "listo";

const resultado = {
  viabilidad: 82,
  resumen:
    "Licitación de suministro e instalación de luminarias LED para alumbrado público comunal. El presupuesto y los plazos son compatibles con tu perfil. Requiere experiencia comprobable en proyectos similares y certificación SEC vigente.",
  certificados: [
    { t: "Certificado de inscripción SEC vigente", ok: true },
    { t: "Boleta de garantía de seriedad (3% del monto)", ok: true },
    { t: "Experiencia en 2 proyectos similares (últimos 3 años)", ok: false },
    { t: "Certificado de antecedentes laborales (F30-1)", ok: true },
  ],
  plazos: [
    { t: "Cierre de recepción de ofertas", v: "12 jun 2026, 15:00" },
    { t: "Apertura técnica y económica", v: "13 jun 2026, 10:00" },
    { t: "Adjudicación estimada", v: "27 jun 2026" },
    { t: "Plazo de ejecución", v: "90 días corridos" },
  ],
};

const sugeridas = [
  "¿Cuál es el criterio de evaluación con mayor ponderación?",
  "¿Qué pasa si no tengo la experiencia mínima requerida?",
  "¿El IVA está incluido en el presupuesto?",
];

export function AnalisisClient() {
  const [fase, setFase] = useState<Fase>("vacio");
  const [chat, setChat] = useState<{ rol: "user" | "ia"; txt: string }[]>([
    {
      rol: "ia",
      txt: "He analizado las bases. Pregúntame lo que necesites sobre requisitos, plazos o criterios de evaluación.",
    },
  ]);
  const [input, setInput] = useState("");

  const analizar = () => {
    setFase("analizando");
    setTimeout(() => setFase("listo"), 1600);
  };

  const enviar = (texto: string) => {
    const t = texto.trim();
    if (!t) return;
    setChat((c) => [...c, { rol: "user", txt: t }]);
    setInput("");
    setTimeout(() => {
      setChat((c) => [
        ...c,
        {
          rol: "ia",
          txt: "Según las bases, el criterio económico pondera 40%, la experiencia 35% y el cumplimiento técnico 25%. Te recomiendo reforzar la experiencia para mejorar tu puntaje.",
        },
      ]);
    }, 800);
  };

  return (
    <div>
      <PageHeader
        title="Análisis de bases con IA"
        subtitle="Sube el PDF de las bases y obtén requisitos, plazos y viabilidad en segundos."
      />

      {fase === "vacio" && (
        <button
          onClick={analizar}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 py-16 text-center transition-colors hover:bg-brand-50"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
            <Upload size={26} />
          </span>
          <span className="text-base font-semibold text-ink">
            Arrastra el PDF de las bases o haz clic para subir
          </span>
          <span className="text-sm text-muted">
            Formatos PDF · hasta 25 MB · (demo: usa un ejemplo)
          </span>
        </button>
      )}

      {fase === "analizando" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-card py-20">
          <Loader2 className="animate-spin text-brand-600" size={32} />
          <p className="text-sm font-medium text-ink">
            Analizando bases con IA…
          </p>
          <p className="text-xs text-muted">
            Extrayendo requisitos, plazos y criterios de evaluación
          </p>
        </div>
      )}

      {fase === "listo" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* Viabilidad */}
            <div className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent-500/10">
                  <span className="text-lg font-bold text-accent-600">
                    {resultado.viabilidad}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-brand-600" />
                    <h2 className="font-semibold text-ink">
                      Viabilidad para postular: Alta
                    </h2>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {resultado.resumen}
                  </p>
                </div>
              </div>
            </div>

            {/* Certificados */}
            <div className="rounded-2xl border border-line bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <FileCheck2 size={18} className="text-brand-600" />
                <h2 className="font-semibold text-ink">Requisitos y certificados</h2>
              </div>
              <ul className="space-y-2.5">
                {resultado.certificados.map((c) => (
                  <li key={c.t} className="flex items-start gap-2.5 text-sm">
                    {c.ok ? (
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-accent-500"
                      />
                    ) : (
                      <AlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-500"
                      />
                    )}
                    <span className={c.ok ? "text-ink" : "text-ink"}>
                      {c.t}
                      {!c.ok && (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                          Por verificar
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Plazos */}
            <div className="rounded-2xl border border-line bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock size={18} className="text-brand-600" />
                <h2 className="font-semibold text-ink">Plazos clave</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {resultado.plazos.map((p) => (
                  <div key={p.t} className="rounded-xl bg-surface p-3">
                    <p className="text-xs text-muted">{p.t}</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">{p.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Asistente IA */}
          <div className="flex h-fit flex-col rounded-2xl border border-line bg-card">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
                <Sparkles size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Asistente IA</p>
                <p className="text-xs text-muted">Pregunta sobre estas bases</p>
              </div>
            </div>

            <div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-4">
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.rol === "ia"
                      ? "bg-surface text-ink"
                      : "ml-auto bg-brand-600 text-white"
                  }`}
                >
                  {m.txt}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {sugeridas.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:bg-surface"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar(input);
              }}
              className="flex items-center gap-2 border-t border-line p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta…"
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="submit"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                aria-label="Enviar"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
