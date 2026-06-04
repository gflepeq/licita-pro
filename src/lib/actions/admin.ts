"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { currentUser } from "@/lib/current-user";
import {
  setUserPlan,
  setUserRole,
  setConfig,
  adminCreateUser,
  adminUpdateUser,
  deleteUser,
  getUserByEmail,
  getUserById,
  createPlan,
  updatePlan,
  deletePlan,
  getPlanById,
} from "@/lib/db";

async function requireAdmin() {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (!u.isAdmin) redirect("/dashboard");
  return u;
}

function revalAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/planes");
}

export type AdminFormState = { error?: string; ok?: boolean } | undefined;

// ---------- Usuarios ----------
export async function setPlanAction(userId: number, plan: string) {
  await requireAdmin();
  await setUserPlan(userId, plan);
  revalAdmin();
}

export async function setRoleAction(userId: number, role: string) {
  const admin = await requireAdmin();
  if (userId === admin.id && role !== "admin") return;
  await setUserRole(userId, role);
  revalAdmin();
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function crearUsuarioAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const plan = String(formData.get("plan") ?? "Trial");
  const role = String(formData.get("role") ?? "user");

  if (!nombre || !email) return { error: "Nombre y email son obligatorios." };
  if (!emailRe.test(email)) return { error: "Email no válido." };
  if (password.length < 6) return { error: "La contraseña debe tener 6+ caracteres." };
  if (await getUserByEmail(email)) return { error: "Ya existe una cuenta con ese email." };

  const hash = await bcrypt.hash(password, 10);
  await adminCreateUser({ email, passwordHash: hash, nombre, empresa, plan, role });
  revalAdmin();
  return { ok: true };
}

export async function editarUsuarioAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const userId = Number(formData.get("userId"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim();
  const plan = String(formData.get("plan") ?? "Trial");
  let role = String(formData.get("role") ?? "user");
  if (!nombre) return { error: "El nombre es obligatorio." };
  if (userId === admin.id) role = "admin"; // no se auto-degrada
  await adminUpdateUser(userId, { nombre, empresa, plan, role });
  revalAdmin();
  return { ok: true };
}

export async function eliminarUsuarioAction(userId: number) {
  const admin = await requireAdmin();
  if (userId === admin.id) return; // no puede eliminarse a sí mismo
  const target = await getUserById(userId);
  if (target) await deleteUser(userId);
  revalAdmin();
}

// ---------- Planes ----------
function parseFeatures(formData: FormData): string[] {
  return formData.getAll("features").map(String);
}
const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function guardarPlanAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();
  const editId = String(formData.get("editId") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const precio = Math.max(0, Math.round(Number(formData.get("precio") ?? 0)));
  const periodo = String(formData.get("periodo") ?? "/mes").trim() || "/mes";
  const destacado = formData.get("destacado") === "on";
  const activo = formData.get("activo") !== "off";
  const orden = Number(formData.get("orden") ?? 99);
  const features = parseFeatures(formData);

  if (!nombre) return { error: "El nombre del plan es obligatorio." };

  if (editId) {
    await updatePlan(editId, { nombre, precio, periodo, features, destacado, activo, orden });
  } else {
    const id = slug(nombre) || `plan-${Date.now()}`;
    if (await getPlanById(id)) return { error: "Ya existe un plan con ese nombre." };
    await createPlan({ id, nombre, precio, periodo, features, destacado, activo, orden });
  }
  revalidatePath("/admin/planes");
  revalidatePath("/");
  return { ok: true };
}

export async function eliminarPlanAction(id: string) {
  await requireAdmin();
  await deletePlan(id);
  revalidatePath("/admin/planes");
  revalidatePath("/");
}

// ---------- Config ----------
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
