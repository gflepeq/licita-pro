import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel del formulario */}
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
            <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>

      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden bg-brand-700 lg:block">
        <div className="absolute inset-0 bg-hero-glow opacity-70" />
        <div className="relative flex h-full flex-col justify-center px-12 text-white">
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Detecta y gana licitaciones del Estado con IA
          </h2>
          <p className="mt-4 max-w-md text-brand-100">
            Únete a las PYMEs que dejaron de buscar a mano en Mercado Público.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Detección diaria con score de relevancia",
              "Análisis de bases con IA en segundos",
              "Alertas por correo y WhatsApp",
              "Seguimiento de adjudicaciones",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-brand-50">
                <CheckCircle2 size={20} className="shrink-0 text-accent-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
