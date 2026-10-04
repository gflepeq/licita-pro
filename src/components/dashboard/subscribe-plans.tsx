"use client";

import { toPlain } from "@/lib/form-input";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, CheckCircle2, CreditCard, Loader2, Minus } from "lucide-react";
import { CAPACIDADES } from "@/lib/capacidades";
import { iniciarPagoAction, type PagoState } from "@/lib/actions/pago";
import { fmtCLP } from "@/lib/data";

type PlanOpt = { id: string; nombre: string; precio: number; periodo: string; features: string[]; destacado?: boolean };

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
      className="inline-flex items-center gap-2 rounded-lg btn-ink px-4 py-2 text-sm font-semibold disabled:opacity-60"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
      Contratar
    </button>
  );
}

export function SubscribePlans({
  planes,
  currentPlan,
  pagoResultado,
}: {
  planes: PlanOpt[];
  currentPlan: string;
  pagoResultado?: "ok" | "error";
}) {
  const [state, formAction] = useActionState<PagoState, FormData>(
    (s: PagoState, fd: FormData) => iniciarPagoAction(s, toPlain(fd)),
    undefined
  );

  return (
    <div id="planes" className="card scroll-mt-24 p-5">
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
        {planes.map((p) => {
          const actual = p.id === currentPlan;
          return (
            <div
              key={p.id}
              className={`flex flex-col rounded-xl border p-4 ${
                actual ? "border-brand-600 bg-brand-50/40 dark:bg-brand-950/30" : "border-line"
              }`}
            >
              <p className="flex items-center justify-between gap-2 text-sm font-semibold text-ink">
                {p.nombre}
                {p.destacado && (
                  <span className="bg-flow rounded-full px-2 py-0.5 text-[10px] font-semibold text-white">
                    Recomendado
                  </span>
                )}
              </p>
              <p className="mt-1 text-xl font-extrabold tracking-tight text-ink">
                {fmtCLP(p.precio)}
                <span className="ml-1 text-xs font-normal text-muted">{p.periodo}</span>
              </p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {CAPACIDADES.map((c) => {
                  const ok = p.features.includes(c.key);
                  return (
                    <li key={c.key} className={`flex items-start gap-1.5 text-xs ${ok ? "text-ink/85" : "text-muted/70 line-through"}`}>
                      {ok ? (
                        <Check size={13} className="mt-0.5 shrink-0 text-accent-600" />
                      ) : (
                        <Minus size={13} className="mt-0.5 shrink-0" />
                      )}
                      {c.label}
                    </li>
                  );
                })}
              </ul>
              <form action={formAction} className="mt-4">
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
