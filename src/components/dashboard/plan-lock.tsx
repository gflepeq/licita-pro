import Link from "next/link";
import { Lock } from "lucide-react";

// Aviso de capacidad bloqueada por el plan, con CTA para mejorar.
export function PlanLock({
  texto,
  className = "",
}: {
  texto: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <span className="flex items-center gap-2">
        <Lock size={15} className="shrink-0" />
        {texto}
      </span>
      <Link
        href="/dashboard/configuracion"
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-amber-700"
      >
        Mejorar plan
      </Link>
    </div>
  );
}
