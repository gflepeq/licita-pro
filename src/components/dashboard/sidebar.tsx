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
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        {active && <span className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-brand-500" />}
        <l.icon size={18} className={active ? "text-brand-400" : ""} />
        {l.label}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col gap-2 border-r border-white/5 bg-[#0b1120] px-4 py-5 text-slate-300">
      <div className="px-2">
        <Logo name={user.appName} dark />
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {links.map(item)}
        <div className="my-3 border-t border-white/10" />
        {bottom.map(item)}
        {user.isAdmin &&
          item({ href: "/admin", label: "Super Admin", icon: Shield })}
      </nav>

      <div className="bg-brand-gradient rounded-2xl p-4 text-white shadow-lg shadow-brand-600/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Tu plan</p>
        <p className="mt-0.5 text-sm font-bold">{user.plan}</p>
        <Link
          href="/dashboard/configuracion"
          className="mt-3 block w-full rounded-lg bg-white/15 px-3 py-2 text-center text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
        >
          Gestionar plan
        </Link>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {user.iniciales}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.nombre}</p>
          <p className="truncate text-xs text-slate-400">{user.empresa}</p>
        </div>
        <form action={() => logoutAction()}>
          <button
            type="submit"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-red-400"
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
