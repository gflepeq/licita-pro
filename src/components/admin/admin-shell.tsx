"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/lib/actions/auth";
import type { SafeUser } from "@/lib/types";

const links = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/planes", label: "Planes", icon: CreditCard },
  { href: "/admin/pagos", label: "Pagos", icon: Receipt },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminShell({
  user,
  children,
}: {
  user: SafeUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <div className="flex h-full flex-col gap-2 border-r border-line bg-card px-4 py-5 dark:bg-slate-900">
      <div className="flex items-center gap-2 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
          <Shield size={18} />
        </span>
        <div>
          <p className="text-sm font-bold tracking-tight text-ink">Super Admin</p>
          <p className="text-xs text-muted">{user.appName}</p>
        </div>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {links.map((l) => {
          const active =
            l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-ink text-white"
                  : "text-slate-600 hover:bg-surface hover:text-ink dark:text-slate-300"
              }`}
            >
              <l.icon size={18} />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
      >
        <ArrowLeft size={16} /> Volver al panel
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-surface"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{nav}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            {nav}
            <button
              onClick={() => setOpen(false)}
              className="absolute -right-12 top-4 grid h-9 w-9 place-items-center rounded-lg bg-card text-ink"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-card/80 px-4 backdrop-blur-md dark:bg-slate-900/80 sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink lg:hidden"
            aria-label="Menú"
          >
            <Menu size={20} />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
            <Shield size={12} /> Modo administrador
          </span>
          <div className="flex-1" />
          <ThemeToggle />
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-bold text-white">
            {user.iniciales}
          </span>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
