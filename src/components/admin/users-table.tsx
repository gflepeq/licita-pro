"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil, Plus, Shield, Trash2, UserPlus, X } from "lucide-react";
import {
  crearUsuarioAction,
  editarUsuarioAction,
  eliminarUsuarioAction,
  type AdminFormState,
} from "@/lib/actions/admin";
import type { AdminUser } from "@/lib/db";

type PlanOpt = { id: string; nombre: string };

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {label}
    </button>
  );
}

function PlanSelect({ planes, def }: { planes: PlanOpt[]; def?: string }) {
  return (
    <select
      name="plan"
      defaultValue={def ?? planes[0]?.id}
      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
    >
      {planes.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nombre}
        </option>
      ))}
    </select>
  );
}

function RoleSelect({ def }: { def?: string }) {
  return (
    <select
      name="role"
      defaultValue={def ?? "user"}
      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
    >
      <option value="user">Usuario</option>
      <option value="admin">Admin</option>
    </select>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function UsersTable({
  users,
  planes,
  currentAdminId,
}: {
  users: AdminUser[];
  planes: PlanOpt[];
  currentAdminId: number;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [, startTransition] = useTransition();

  const [createState, createAction] = useActionState<AdminFormState, FormData>(
    crearUsuarioAction,
    undefined
  );
  const [editState, editAction] = useActionState<AdminFormState, FormData>(
    editarUsuarioAction,
    undefined
  );

  // Cierra formularios cuando la acción fue exitosa.
  if (createState?.ok && creating) setCreating(false);
  if (editState?.ok && editing) setEditing(null);

  const eliminar = (u: AdminUser) => {
    if (u.id === currentAdminId) return;
    if (!confirm(`¿Eliminar a ${u.nombre} (${u.email})? Esta acción no se puede deshacer.`)) return;
    startTransition(() => eliminarUsuarioAction(u.id));
  };

  const fecha = (iso: string) =>
    iso ? new Date(iso.replace(" ", "T")).toLocaleDateString("es-CL") : "—";

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>

      {creating && (
        <form
          action={createAction}
          className="mb-5 rounded-2xl border border-line bg-card p-5"
        >
          <h3 className="mb-3 font-semibold text-ink">Crear usuario</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="nombre" placeholder="Nombre" className={inputCls} />
            <input name="email" type="email" placeholder="Email" className={inputCls} />
            <input name="empresa" placeholder="Empresa (opcional)" className={inputCls} />
            <input name="password" type="password" placeholder="Contraseña (6+)" className={inputCls} />
            <PlanSelect planes={planes} />
            <RoleSelect />
          </div>
          {createState?.error && (
            <p className="mt-3 text-sm text-red-600">{createState.error}</p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <SaveBtn label="Crear usuario" />
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{u.nombre}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.empresa || "—"}</td>
                  <td className="px-4 py-3 text-muted">{u.plan}</td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">
                        <Shield size={11} /> Admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Usuario</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{fecha(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(u)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-brand-600"
                        aria-label="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => eliminar(u)}
                        disabled={u.id === currentAdminId}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-red-600 disabled:opacity-40"
                        aria-label="Eliminar"
                        title={u.id === currentAdminId ? "No puedes eliminarte" : "Eliminar"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de edición */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setEditing(null)}
        >
          <form
            action={editAction}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl border border-line bg-card p-5 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-ink">Editar usuario</h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface"
              >
                <X size={18} />
              </button>
            </div>
            <input type="hidden" name="userId" value={editing.id} />
            <div className="space-y-3">
              <p className="text-xs text-muted">{editing.email}</p>
              <input name="nombre" defaultValue={editing.nombre} placeholder="Nombre" className={inputCls} />
              <input name="empresa" defaultValue={editing.empresa} placeholder="Empresa" className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <PlanSelect planes={planes} def={editing.plan} />
                <RoleSelect def={editing.role} />
              </div>
            </div>
            {editState?.error && <p className="mt-3 text-sm text-red-600">{editState.error}</p>}
            <div className="mt-4 flex items-center gap-2">
              <SaveBtn label="Guardar cambios" />
              <button
                type="button"
                onClick={() => setEditing(null)}
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
