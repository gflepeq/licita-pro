"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { saveConfigAction, type ConfigState } from "@/lib/actions/admin";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      Guardar configuración
    </button>
  );
}

export function ConfigForm({ config }: { config: Record<string, string> }) {
  const [state, action] = useActionState<ConfigState, FormData>(saveConfigAction, undefined);

  return (
    <form action={action} className="space-y-5">
      <div className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-4 font-semibold text-ink">General</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nombre de la plataforma"
            name="nombre_plataforma"
            defaultValue={config.nombre_plataforma || "LiciApp"}
          />
          <Field
            label="Email de soporte"
            name="soporte_email"
            defaultValue={config.soporte_email || "soporte@licitapro.cl"}
          />
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-ink">Anuncio global (banner)</span>
          <textarea
            name="anuncio"
            rows={2}
            defaultValue={config.anuncio || ""}
            placeholder="Mensaje que verán todos los usuarios (opcional)"
            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-line bg-card p-5">
        <div>
          <p className="font-medium text-ink">Modo mantenimiento</p>
          <p className="text-sm text-muted">
            Muestra un aviso de mantenimiento (no bloquea el acceso en esta demo).
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            name="modo_mantenimiento"
            defaultChecked={config.modo_mantenimiento === "1"}
            className="h-5 w-5 accent-brand-600"
          />
          <span className="text-sm text-muted">Activar</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Save />
        {state?.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600">
            <CheckCircle2 size={16} /> Configuración guardada
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
