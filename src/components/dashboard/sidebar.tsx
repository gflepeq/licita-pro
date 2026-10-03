"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  FileSearch,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/lib/actions/auth";
import type { SafeUser } from "@/lib/types";

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  cap?: string; // capacidad del plan requerida
};

const principal: NavLink[] = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/licitaciones", label: "Oportunidades", icon: ListChecks },
  { href: "/dashboard/oportunidades", label: "Guardadas", icon: Bookmark },
  { href: "/dashboard/analisis", label: "Análisis IA", icon: FileSearch, cap: "analisis_ia" },
  { href: "/dashboard/adjudicaciones", label: "Adjudicaciones", icon: Trophy },
];

const cuenta: NavLink[] = [
  { href: "/dashboard/alertas", label: "Alertas", icon: Bell },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar({ user, onNavigate }: { user: SafeUser; onNavigate?: () => void }) {
  const pathname = usePathname();

  const item = (l: NavLink) => {
    const active = l.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(l.href);
    const locked = l.cap && !user.capacidades.includes(l.cap);
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={onNavigate}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-brand-50 text-brand-700 dark:text-brand-300"
            : "text-muted hover:bg-subtle hover:text-ink"
        }`}
      >
        {active && <span className="absolute inset-y-2 -left-4 w-1 rounded-r-full bg-brand-600" />}
        <l.icon size={18} className={active ? "text-brand-600" : "text-muted group-hover:text-ink"} />
        <span className="flex-1">{l.label}</span>
        {locked && <Lock size={13} className="text-muted" />}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col gap-2 border-r border-line bg-card px-4 py-5">
      <div className="px-2">
        <Logo name={user.appName} />
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        <p className="eyebrow mb-1.5 px-3">Principal</p>
        {principal.map(item)}
        <p className="eyebrow mb-1.5 mt-5 px-3">Cuenta</p>
        {cuenta.map(item)}
        {user.isAdmin && item({ href: "/admin", label: "Super Admin", icon: Shield })}
      </nav>

      <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-4 text-white">
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
          <Sparkles size={13} /> Tu plan
        </p>
        <p className="mt-0.5 font-display text-base font-bold">{user.plan}</p>
        <Link
          href="/dashboard/configuracion#planes"
          onClick={onNavigate}
          className="mt-3 block w-full rounded-lg bg-white/15 px-3 py-2 text-center text-xs font-semibold backdrop-blur transition-colors hover:bg-white/25"
        >
          Gestionar plan
        </Link>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">
          {user.iniciales}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{user.nombre}</p>
          <p className="truncate text-xs text-muted">{user.empresa}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-600"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
