"use client";

import { useState, useTransition } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { setPlanAction, setRoleAction } from "@/lib/actions/admin";
import { PLAN_IDS } from "@/lib/planes";
import type { AdminUser } from "@/lib/db";

export function UsersTable({
  users,
  currentAdminId,
}: {
  users: AdminUser[];
  currentAdminId: number;
}) {
  const [rows, setRows] = useState(users);
  const [pending, startTransition] = useTransition();

  const changePlan = (id: number, plan: string) => {
    setRows((r) => r.map((u) => (u.id === id ? { ...u, plan } : u)));
    startTransition(() => setPlanAction(id, plan));
  };

  const toggleRole = (u: AdminUser) => {
    if (u.id === currentAdminId) return;
    const role = u.role === "admin" ? "user" : "admin";
    setRows((r) => r.map((x) => (x.id === u.id ? { ...x, role } : x)));
    startTransition(() => setRoleAction(u.id, role));
  };

  const fecha = (iso: string) =>
    iso ? new Date(iso.replace(" ", "T")).toLocaleDateString("es-CL") : "—";

  return (
    <>
      {/* Tabla desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-card lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Guardadas</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-surface/60">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{u.nombre}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-muted">{u.empresa || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.plan}
                    onChange={(e) => changePlan(u.id, e.target.value)}
                    disabled={pending}
                    className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    {PLAN_IDS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {!PLAN_IDS.includes(u.plan) && <option value={u.plan}>{u.plan}</option>}
                  </select>
                </td>
                <td className="px-4 py-3 text-ink">{u.guardadas}</td>
                <td className="px-4 py-3 text-muted">{fecha(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleRole(u)}
                    disabled={u.id === currentAdminId || pending}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                      u.role === "admin"
                        ? "bg-ink text-white"
                        : "bg-surface text-muted hover:text-ink"
                    }`}
                    title={u.id === currentAdminId ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
                  >
                    {u.role === "admin" ? <Shield size={12} /> : <ShieldOff size={12} />}
                    {u.role === "admin" ? "Admin" : "Usuario"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="space-y-3 lg:hidden">
        {rows.map((u) => (
          <div key={u.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-medium text-ink">{u.nombre}</p>
                <p className="truncate text-xs text-muted">{u.email}</p>
              </div>
              <button
                onClick={() => toggleRole(u)}
                disabled={u.id === currentAdminId || pending}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                  u.role === "admin" ? "bg-ink text-white" : "bg-surface text-muted"
                }`}
              >
                {u.role === "admin" ? "Admin" : "Usuario"}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <select
                value={u.plan}
                onChange={(e) => changePlan(u.id, e.target.value)}
                disabled={pending}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              >
                {PLAN_IDS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                {!PLAN_IDS.includes(u.plan) && <option value={u.plan}>{u.plan}</option>}
              </select>
              <span className="text-xs text-muted">{u.guardadas} guardadas</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
