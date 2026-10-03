"use client";

import { Moon, Sun } from "lucide-react";

function setThemeCookie(theme: "light" | "dark") {
  document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

// El ícono se resuelve con CSS (dark:) → sin estado ni parpadeo al hidratar.
export function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = () => {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setThemeCookie(next);
  };

  return (
    <button
      onClick={toggle}
      className={`grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-ink ${className}`}
      aria-label="Cambiar tema"
      title="Cambiar tema claro/oscuro"
    >
      <Moon size={18} className="dark:hidden" />
      <Sun size={18} className="hidden dark:block" />
    </button>
  );
}
