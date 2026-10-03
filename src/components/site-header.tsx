"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { href: "#problema", label: "El problema" },
  { href: "#soluciones", label: "Soluciones" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#precios", label: "Precios" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/70 backdrop-blur-xl dark:bg-slate-950/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-ink dark:text-slate-300"
          >
            Ingresar
          </Link>
          <Link
            href="/registro"
            className="rounded-lg btn-ink px-4 py-2 text-sm font-semibold transition-all hover:shadow-md"
          >
            Prueba 7 días
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg text-ink lg:hidden"
          aria-label="Menú"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-card px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg border border-line px-4 py-2.5 text-center text-sm font-semibold text-ink"
            >
              Ingresar
            </Link>
            <Link
              href="/registro"
              onClick={() => setOpen(false)}
              className="rounded-lg btn-ink px-4 py-2.5 text-center text-sm font-semibold"
            >
              Prueba 7 días
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
