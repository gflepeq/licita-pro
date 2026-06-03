import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { currentUser } from "@/lib/current-user";
import type { SafeUser } from "@/lib/types";

export const metadata: Metadata = { title: "Super Admin — Licitapro" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/dashboard");

  const safe: SafeUser = {
    nombre: user.nombre,
    empresa: user.empresa,
    email: user.email,
    plan: user.plan,
    iniciales: user.iniciales,
    appName: user.appName,
    accent: user.accent,
    theme: user.theme,
    isAdmin: user.isAdmin,
  };

  return <AdminShell user={safe}>{children}</AdminShell>;
}
