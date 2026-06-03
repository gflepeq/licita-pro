"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { ChipSelect } from "@/components/chip-select";
import { updateProfileAction, type FormState } from "@/lib/actions/profile";
import { RUBROS, REGIONES } from "@/lib/catalogos";

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {label}
    </button>
  );
}

export function ProfileForm({
  nombre,
  empresa,
  rut,
  email,
  rubros: rubrosInit,
  regiones: regionesInit,
}: {
  nombre: string;
  empresa: string;
  rut: string;
  email: string;
  rubros: string[];
  regiones: string[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateProfileAction,
    undefined
  );
  const [rubros, setRubros] = useState(rubrosInit);
  const [regiones, setRegiones] = useState(regionesInit);

  return (
    <form action={action} className="space-y-5">
      <div className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-4 font-semibold text-ink">Datos de la empresa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de contacto" name="nombre" defaultValue={nombre} />
          <Field label="Razón social" name="empresa" defaultValue={empresa} />
          <Field label="RUT" name="rut" defaultValue={rut} />
          <Field label="Email" name="email" defaultValue={email} disabled />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-1 font-semibold text-ink">Rubros de interés</h2>
        <p className="mb-4 text-sm text-muted">
          La IA priorizará licitaciones de estas categorías.
        </p>
        <ChipSelect name="rubros" options={RUBROS} selected={rubros} onChange={setRubros} />
      </div>

      <div className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-1 font-semibold text-ink">Regiones</h2>
        <p className="mb-4 text-sm text-muted">
          Solo recibirás oportunidades de las regiones seleccionadas.
        </p>
        <ChipSelect name="regiones" options={REGIONES} selected={regiones} onChange={setRegiones} />
      </div>

      <div className="flex items-center gap-3">
        <Save label="Guardar cambios" />
        {state?.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600">
            <CheckCircle2 size={16} /> Guardado
          </span>
        )}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
      />
    </label>
  );
}
