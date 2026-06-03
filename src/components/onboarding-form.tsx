"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { ChipSelect } from "@/components/chip-select";
import { onboardingAction, type FormState } from "@/lib/actions/profile";
import { RUBROS, REGIONES } from "@/lib/catalogos";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      Empezar a detectar oportunidades
      {!pending && <ArrowRight size={16} />}
    </button>
  );
}

export function OnboardingForm({ empresaInicial }: { empresaInicial: string }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    onboardingAction,
    undefined
  );
  const [rubros, setRubros] = useState<string[]>([]);
  const [regiones, setRegiones] = useState<string[]>([]);

  return (
    <form action={formAction} className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink">Nombre de la empresa</span>
          <input
            name="empresa"
            defaultValue={empresaInicial}
            placeholder="Innova Suministros SpA"
            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-ink">RUT (opcional)</span>
          <input
            name="rut"
            placeholder="76.543.210-9"
            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">¿Qué vende tu empresa?</h3>
        <p className="mb-3 text-sm text-muted">
          La IA priorizará licitaciones de estos rubros.
        </p>
        <ChipSelect
          name="rubros"
          options={RUBROS}
          selected={rubros}
          onChange={setRubros}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">¿En qué regiones operas?</h3>
        <p className="mb-3 text-sm text-muted">
          Solo recibirás oportunidades de estas regiones.
        </p>
        <ChipSelect
          name="regiones"
          options={REGIONES}
          selected={regiones}
          onChange={setRegiones}
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="shrink-0" />
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
