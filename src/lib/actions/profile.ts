"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  completeOnboarding,
  updateProfile,
  updateAlerts,
  updateAppearance,
} from "@/lib/db";
import { requireUserId } from "@/lib/actions/auth";

export type FormState = { error?: string; ok?: boolean } | undefined;

export async function onboardingAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const uid = await requireUserId();
  const empresa = String(formData.get("empresa") ?? "").trim();
  const rut = String(formData.get("rut") ?? "").trim();
  const rubros = formData.getAll("rubros").map(String);
  const regiones = formData.getAll("regiones").map(String);

  if (!empresa) return { error: "Ingresa el nombre de tu empresa." };
  if (rubros.length === 0)
    return { error: "Selecciona al menos un rubro de interés." };
  if (regiones.length === 0)
    return { error: "Selecciona al menos una región." };

  await completeOnboarding(uid, { empresa, rut, rubros, regiones });
  redirect("/dashboard");
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const uid = await requireUserId();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim();
  const rut = String(formData.get("rut") ?? "").trim();
  const rubros = formData.getAll("rubros").map(String);
  const regiones = formData.getAll("regiones").map(String);

  if (!nombre || !empresa)
    return { error: "Nombre y empresa son obligatorios." };

  await updateProfile(uid, { nombre, empresa, rut, rubros, regiones });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateAlertsAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const uid = await requireUserId();
  await updateAlerts(uid, {
    alertCorreo: formData.get("alertCorreo") === "on",
    alertWhatsapp: formData.get("alertWhatsapp") === "on",
    alertResumen: formData.get("alertResumen") === "on",
    umbral: Number(formData.get("umbral") ?? 75),
  });
  return { ok: true };
}

export async function updateAppearanceAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const uid = await requireUserId();
  const theme = formData.get("theme") === "dark" ? "dark" : "light";
  const accent = String(formData.get("accent") ?? "blue");
  const appName = String(formData.get("appName") ?? "Licitapro").trim() || "Licitapro";

  await updateAppearance(uid, { theme, accent, appName });

  // Persiste también en cookies para que el SSR renderice sin parpadeo.
  const { cookies } = await import("next/headers");
  const store = await cookies();
  store.set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  store.set("accent", accent, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
