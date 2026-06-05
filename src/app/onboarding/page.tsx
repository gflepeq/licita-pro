import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "@/components/onboarding-form";
import { currentUser } from "@/lib/current-user";

export const metadata = { title: "Configura tu perfil — LiciApp" };

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.onboarded) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <span className="text-sm font-semibold text-brand-600">Bienvenido</span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
          Configura tu perfil, {user.nombre.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Esto entrena al motor de IA para detectar las mejores oportunidades para ti.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-card p-6 sm:p-8">
          <OnboardingForm empresaInicial={user.empresa} />
        </div>
      </main>
    </div>
  );
}
