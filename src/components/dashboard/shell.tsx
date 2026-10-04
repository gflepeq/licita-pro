"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { PlanProvider } from "./plan-context";
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
  const [term, setTerm] = useState("");
  const router = useRouter();

  return (
    <PlanProvider capacidades={user.capacidades}>
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink lg:hidden"
            aria-label="Menú"
          >
            <Menu size={20} />
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = term.trim();
              if (v) router.push(`/dashboard/licitaciones?q=${encodeURIComponent(v)}`);
            }}
            className="flex flex-1 items-center"
          >
            <div className="relative w-full max-w-md">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar licitaciones y compras ágiles…"
                className="w-full rounded-xl border border-line bg-card py-2 pl-10 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-100 dark:bg-slate-800"
              />
            </div>
          </form>

          <ThemeToggle />
          <Link
            href="/dashboard/alertas"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
            aria-label="Alertas"
          >
            <Bell size={20} />
          </Link>
          <span className="bg-brand-gradient hidden h-9 w-9 place-items-center rounded-full text-sm font-bold text-white sm:grid">
            {user.iniciales}
          </span>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
    </PlanProvider>
  );
}
