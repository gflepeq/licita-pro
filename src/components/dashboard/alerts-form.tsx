"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Lock, Mail, MessageCircle, Smartphone } from "lucide-react";
import { updateAlertsAction, type FormState } from "@/lib/actions/profile";

function Toggle({
  name,
  on,
  onClick,
}: {
  name: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <>
      <input type="hidden" name={name} value={on ? "on" : "off"} />
      <button
        type="button"
        onClick={onClick}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          on ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"
        }`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      Guardar preferencias
    </button>
  );
}

export function AlertsForm({
  correo,
  whatsapp,
  resumen,
  umbral: umbralInit,
  capacidades,
}: {
  correo: boolean;
  whatsapp: boolean;
  resumen: boolean;
  umbral: number;
  capacidades: string[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateAlertsAction,
    undefined
  );
  const [c, setC] = useState(correo);
  const [w, setW] = useState(whatsapp);
  const [r, setR] = useState(resumen);
  const [umbral, setUmbral] = useState(umbralInit);

  const canales = [
    { icon: Mail, t: "Alertas por correo", d: "Resumen diario de oportunidades relevantes.", name: "alertCorreo", cap: "alertas_correo", on: c, set: () => setC((v) => !v) },
    { icon: MessageCircle, t: "Alertas por WhatsApp", d: "Las oportunidades relevantes directo a tu WhatsApp.", name: "alertWhatsapp", cap: "alertas_whatsapp", on: w, set: () => setW((v) => !v) },
    { icon: Smartphone, t: "Resumen semanal de adjudicaciones", d: "Cada lunes, los resultados de lo que seguiste.", name: "alertResumen", cap: "resumen_semanal", on: r, set: () => setR((v) => !v) },
  ];

  return (
    <form action={action}>
      <div className="space-y-3">
        {canales.map((ch) => {
          const bloqueado = !capacidades.includes(ch.cap);
          return (
            <div
              key={ch.t}
              className={`flex items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5 ${
                bloqueado ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                  <ch.icon size={20} />
                </span>
                <div>
                  <p className="font-medium text-ink">{ch.t}</p>
                  <p className="text-sm text-muted">
                    {bloqueado ? "Disponible en planes superiores." : ch.d}
                  </p>
                </div>
              </div>
              {bloqueado ? (
                <>
                  <input type="hidden" name={ch.name} value="off" />
                  <Lock size={16} className="text-muted" />
                </>
              ) : (
                <Toggle name={ch.name} on={ch.on} onClick={ch.set} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-card p-5">
        <p className="font-medium text-ink">Umbral mínimo de relevancia</p>
        <p className="text-sm text-muted">
          Solo te avisaremos de oportunidades con un score igual o superior a{" "}
          <span className="font-semibold text-brand-600">{umbral}</span>.
        </p>
        <input
          type="range"
          name="umbral"
          min={50}
          max={95}
          value={umbral}
          onChange={(e) => setUmbral(Number(e.target.value))}
          className="mt-4 w-full accent-brand-600"
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>50 · más oportunidades</span>
          <span>95 · solo lo mejor</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Save />
        {state?.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600">
            <CheckCircle2 size={16} /> Preferencias guardadas
          </span>
        )}
      </div>
    </form>
  );
}
