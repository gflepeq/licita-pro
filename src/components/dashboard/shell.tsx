"use client";

import { useState } from "react";
import { Bell, Menu, Search, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SafeUser } from "@/lib/types";

export function DashboardShell({
  user,
  children,
}: {
  user: SafeUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950">
      {/* Sidebar fijo en desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar user={user} />
      </aside>

      {/* Sidebar móvil */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <Sidebar user={user} onNavigate={() => setOpen(false)} />
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
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-card/80 px-4 backdrop-blur-md dark:bg-slate-900/80 sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink lg:hidden"
            aria-label="Menú"
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-1 items-center">
            <div className="relative w-full max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                placeholder="Buscar licitaciones, organismos, rubros…"
                className="w-full rounded-lg border border-line bg-surface py-2 pl-10 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100 dark:bg-slate-800"
              />
            </div>
          </div>

          <ThemeToggle />
          <button className="relative grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
            <Bell size={20} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white dark:ring-slate-900" />
          </button>
          <span className="hidden h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white sm:grid">
            {user.iniciales}
          </span>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
