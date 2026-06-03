import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUserId } from "@/lib/session";

export const metadata = { title: "Ingresar — Licitapro" };

export default async function LoginPage() {
  if (await getSessionUserId()) redirect("/dashboard");
  return (
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Ingresa para ver tus oportunidades detectadas."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
