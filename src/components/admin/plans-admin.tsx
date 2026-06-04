"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import {
  guardarPlanAction,
  eliminarPlanAction,
  type AdminFormState,
} from "@/lib/actions/admin";
import { fmtCLP } from "@/lib/data";
import type { Plan } from "@/lib/planes";
import type { Capacidad } from "@/lib/capacidades";

const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

function SaveBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      Guardar plan
    </button>
  );
}

export function PlansAdmin({
  planes,
  counts,
  capacidades,
}: {
  planes: Plan[];
  counts: Record<string, number>;
  capacidades: Capacidad[];
}) {
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();
  const [state, action] = useActionState<AdminFormState, FormData>(
    guardarPlanAction,
    undefined
  );

  if (state?.ok && (creating || editing)) {
    setCreating(false);
    setEditing(null);
  }

  const grupos = useMemo(() => {
    const m: Record<string, Capacidad[]> = {};
    capacidades.forEach((c) => (m[c.grupo] ??= []).push(c));
    return m;
  }, [capacidades]);

  const eliminar = (p: Plan) => {
    if (!confirm(`¿Eliminar el plan "${p.nombre}"?`)) return;
    startTransition(() => eliminarPlanAction(p.id));
  };

  const openForm = editing || creating;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {planes.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col rounded-2xl border bg-card p-5 ${
              p.destacado ? "border-brand-600" : "border-line"
            } ${p.activo ? "" : "opacity-60"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-ink">{p.nombre}</h3>
                  {p.destacado && <Star size={14} className="fill-amber-400 text-amber-400" />}
                </div>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                  {counts[p.id] ?? 0} usuarios
                </span>
                {!p.activo && (
                  <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                    inactivo
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setCreating(false);
                    setEditing(p);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-brand-600"
                  aria-label="Editar"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => eliminar(p)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-red-600"
                  aria-label="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-ink">
              {fmtCLP(p.precio)}
              <span className="ml-1 text-xs font-normal text-muted">{p.periodo}</span>
            </p>
            <ul className="mt-4 space-y-1.5">
              {p.features.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-ink">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent-500" />
                  {capacidades.find((c) => c.key === key)?.label ?? key}
                </li>
              ))}
              {p.features.length === 0 && (
                <li className="text-sm text-muted">Sin capacidades asignadas.</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Modal crear/editar */}
      {openForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => {
            setEditing(null);
            setCreating(false);
          }}
        >
          <form
            action={action}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-card p-5 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-ink">{editing ? "Editar plan" : "Nuevo plan"}</h3>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface"
              >
                <X size={18} />
              </button>
            </div>

            {editing && <input type="hidden" name="editId" value={editing.id} />}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-ink">Nombre</span>
                <input name="nombre" defaultValue={editing?.nombre} placeholder="Plan Pro" className={`mt-1 ${inputCls}`} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Precio (CLP)</span>
                <input name="precio" type="number" min={0} defaultValue={editing?.precio ?? 0} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Periodo</span>
                <input name="periodo" defaultValue={editing?.periodo ?? "/mes"} placeholder="/mes" className={`mt-1 ${inputCls}`} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-ink">Orden</span>
                <input name="orden" type="number" defaultValue={editing?.orden ?? 99} className={`mt-1 ${inputCls}`} />
              </label>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="destacado" defaultChecked={editing?.destacado} className="h-4 w-4 accent-brand-600" />
                  Destacado
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="activo" defaultChecked={editing ? editing.activo : true} className="h-4 w-4 accent-brand-600" />
                  Activo
                </label>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-ink">
                Capacidades incluidas
                <span className="ml-1 text-xs font-normal text-muted">
                  (coinciden con los filtros/opciones de la app)
                </span>
              </p>
              <div className="space-y-3">
                {Object.entries(grupos).map(([grupo, caps]) => (
                  <div key={grupo}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{grupo}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {caps.map((c) => (
                        <label key={c.key} className="flex items-center gap-2 text-sm text-ink">
                          <input
                            type="checkbox"
                            name="features"
                            value={c.key}
                            defaultChecked={editing?.features.includes(c.key)}
                            className="h-4 w-4 accent-brand-600"
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

            <div className="mt-5 flex items-center gap-2">
              <SaveBtn />
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
