"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/toast";
import type { SafeUser } from "@/lib/types";

export function DashboardShell({ user, children }: { user: SafeUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const puedeBuscar = user.capacidades.includes("busqueda");

  // Atajo ⌘K / Ctrl+K para buscar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ToastProvider>
    <div className="min-h-screen bg-surface">
      {/* Sidebar fijo en desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar user={user} />
      </aside>

      {/* Sidebar móvil */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-in">
            <Sidebar user={user} onNavigate={() => setOpen(false)} />
            <button
              onClick={() => setOpen(false)}
              className="absolute -right-12 top-4 grid h-9 w-9 place-items-center rounded-xl bg-card text-ink shadow-lift"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-card/75 px-4 backdrop-blur-xl sm:gap-3 sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-xl text-ink hover:bg-subtle lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = term.trim();
              router.push(v && puedeBuscar ? `/dashboard/licitaciones?q=${encodeURIComponent(v)}` : "/dashboard/licitaciones");
            }}
            className="flex flex-1 items-center"
          >
            <div className="relative w-full max-w-md">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={puedeBuscar ? "Buscar por palabra clave o código…" : "Ir a oportunidades…"}
                className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-14 text-sm text-ink placeholder:text-muted transition-colors focus:border-brand-400 focus:bg-card focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-card px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted sm:block">
                Ctrl K
              </kbd>
            </div>
          </form>

          <ThemeToggle />
          <Link
            href="/dashboard/alertas"
            className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-ink"
            aria-label="Alertas"
            title="Alertas"
          >
            <Bell size={18} />
          </Link>
          <Link
            href="/dashboard/configuracion"
            className="hidden h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white ring-2 ring-card sm:grid"
            title={user.nombre}
          >
            {user.iniciales}
          </Link>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
    </ToastProvider>
  );
}
