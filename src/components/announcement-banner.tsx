import { Megaphone, Wrench } from "lucide-react";
import { getConfig } from "@/lib/db";

// Muestra el anuncio global y/o el aviso de mantenimiento configurados en /admin.
export async function AnnouncementBanner({ className = "" }: { className?: string }) {
  let config: Record<string, string> = {};
  try {
    config = await getConfig();
  } catch {
    return null;
  }

  const anuncio = (config.anuncio || "").trim();
  const mantenimiento = config.modo_mantenimiento === "1";

  if (!anuncio && !mantenimiento) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {mantenimiento && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
          <Wrench size={16} className="shrink-0" />
          Estamos en mantenimiento. Algunas funciones podrían no estar disponibles.
        </div>
      )}
      {anuncio && (
        <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200">
          <Megaphone size={16} className="mt-0.5 shrink-0" />
          <span>{anuncio}</span>
        </div>
      )}
    </div>
  );
}
