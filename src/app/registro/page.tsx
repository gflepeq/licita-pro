import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUserId } from "@/lib/session";

export const metadata = { title: "Crear cuenta — Licitapro" };

export default async function RegistroPage() {
  if (await getSessionUserId()) redirect("/dashboard");
  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Empieza tu prueba y detecta oportunidades hoy."
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
