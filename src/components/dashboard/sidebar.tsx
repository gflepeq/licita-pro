"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  FileSearch,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Shield,
  Trophy,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/lib/actions/auth";
import type { SafeUser } from "@/lib/types";

const links = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/licitaciones", label: "Licitaciones", icon: ListChecks },
  { href: "/dashboard/oportunidades", label: "Oportunidades", icon: Bookmark },
  { href: "/dashboard/analisis", label: "Análisis IA", icon: FileSearch },
  { href: "/dashboard/adjudicaciones", label: "Adjudicaciones", icon: Trophy },
];

const bottom = [
  { href: "/dashboard/alertas", label: "Alertas", icon: Bell },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar({
  user,
  onNavigate,
}: {
  user: SafeUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const item = (l: (typeof links)[number]) => {
    const active =
      l.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={onNavigate}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "btn-ink shadow-sm"
            : "text-slate-600 hover:bg-slate-900/[0.04] hover:text-ink dark:text-slate-300 dark:hover:bg-white/5"
        }`}
      >
        <l.icon size={18} />
        {l.label}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col gap-2 border-r border-line bg-white/80 px-4 py-5 backdrop-blur-xl dark:bg-slate-950/80">
      <div className="px-2">
        <Logo name={user.appName} />
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {links.map(item)}
        <div className="my-3 border-t border-line" />
        {bottom.map(item)}
        {user.isAdmin &&
          item({ href: "/admin", label: "Super Admin", icon: Shield })}
      </nav>

      <div className="bg-flow rounded-2xl p-4 text-white shadow-lg shadow-violet-500/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Tu plan</p>
        <p className="mt-0.5 text-sm font-bold">{user.plan}</p>
        <Link
          href="/dashboard/configuracion"
          className="mt-3 block w-full rounded-lg bg-white/15 px-3 py-2 text-center text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
        >
          Gestionar plan
        </Link>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-line p-3">
        <span className="bg-flow grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white">
          {user.iniciales}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{user.nombre}</p>
          <p className="truncate text-xs text-muted">{user.empresa}</p>
        </div>
        <form action={() => logoutAction()}>
          <button
            type="submit"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-red-600"
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
