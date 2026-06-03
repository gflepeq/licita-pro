"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { setUserPlan, setUserRole, setConfig } from "@/lib/db";

async function requireAdmin() {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (!u.isAdmin) redirect("/dashboard");
  return u;
}

export async function setPlanAction(userId: number, plan: string) {
  await requireAdmin();
  await setUserPlan(userId, plan);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
}

export async function setRoleAction(userId: number, role: string) {
  const admin = await requireAdmin();
  // Evita que un admin se quite a sí mismo el rol por error.
  if (userId === admin.id && role !== "admin") return;
  await setUserRole(userId, role);
  revalidatePath("/admin/usuarios");
}

export type ConfigState = { ok?: boolean } | undefined;

export async function saveConfigAction(
  _prev: ConfigState,
  formData: FormData
): Promise<ConfigState> {
  await requireAdmin();
  await setConfig({
    nombre_plataforma: String(formData.get("nombre_plataforma") ?? "").trim(),
    anuncio: String(formData.get("anuncio") ?? "").trim(),
    soporte_email: String(formData.get("soporte_email") ?? "").trim(),
    modo_mantenimiento: formData.get("modo_mantenimiento") === "on" ? "1" : "0",
  });
  revalidatePath("/admin/configuracion");
  return { ok: true };
}
