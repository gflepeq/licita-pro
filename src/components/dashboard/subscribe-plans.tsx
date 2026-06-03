"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { iniciarPagoAction, type PagoState } from "@/lib/actions/pago";
import { fmtCLP } from "@/lib/data";
import { PLANES } from "@/lib/planes";

function PayButton({ actual }: { actual: boolean }) {
  const { pending } = useFormStatus();
  if (actual) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500/10 px-3 py-2 text-sm font-semibold text-accent-600">
        <CheckCircle2 size={15} /> Plan actual
      </span>
    );
  }
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
      Contratar
    </button>
  );
}

export function SubscribePlans({
  currentPlan,
  pagoResultado,
}: {
  currentPlan: string;
  pagoResultado?: "ok" | "error";
}) {
  const [state, formAction] = useActionState<PagoState, FormData>(
    iniciarPagoAction,
    undefined
  );

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <h2 className="font-semibold text-ink">Cambiar de plan</h2>
      <p className="mt-1 text-sm text-muted">
        Suscríbete o cambia tu plan. El pago se procesa de forma segura con Flow.
      </p>

      {pagoResultado === "ok" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-500/10 px-3 py-2.5 text-sm font-medium text-accent-600">
          <CheckCircle2 size={16} /> ¡Pago confirmado! Tu plan se actualizó.
        </div>
      )}
      {pagoResultado === "error" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
          <AlertCircle size={16} /> El pago no se completó. Intenta nuevamente.
        </div>
      )}
      {state?.error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} /> {state.error}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PLANES.map((p) => {
          const actual = p.id === currentPlan;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 ${
                actual ? "border-brand-600 bg-brand-50/40 dark:bg-brand-950/30" : "border-line"
              }`}
            >
              <p className="text-sm font-semibold text-ink">{p.nombre}</p>
              <p className="mt-1 text-xl font-extrabold tracking-tight text-ink">
                {fmtCLP(p.precio)}
                <span className="ml-1 text-xs font-normal text-muted">{p.periodo}</span>
              </p>
              <form action={formAction} className="mt-3">
                <input type="hidden" name="plan" value={p.id} />
                <PayButton actual={actual} />
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
