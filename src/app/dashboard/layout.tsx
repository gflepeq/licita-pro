import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { currentUser } from "@/lib/current-user";
import type { SafeUser } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard — Licitapro",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.onboarded) redirect("/onboarding");

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

  return (
    <DashboardShell user={safe}>
      <AnnouncementBanner className="mb-5" />
      {children}
    </DashboardShell>
  );
}
