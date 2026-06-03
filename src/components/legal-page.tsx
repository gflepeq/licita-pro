import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function LegalPage({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{titulo}</h1>
          <p className="mt-2 text-sm text-muted">Última actualización: {actualizado}</p>
          <div className="legal mt-8 space-y-6 text-sm leading-relaxed text-muted">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">{titulo}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
