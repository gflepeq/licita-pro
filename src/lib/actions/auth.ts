"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail, getUserById } from "@/lib/db";
import {
  createSessionCookie,
  destroySessionCookie,
  getSessionUserId,
} from "@/lib/session";

export type AuthState = { error?: string } | undefined;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!nombre || !email || !password)
    return { error: "Completa todos los campos." };
  if (!emailRe.test(email)) return { error: "Ingresa un correo válido." };
  if (password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (getUserByEmail(email))
    return { error: "Ya existe una cuenta con este correo." };

  const hash = await bcrypt.hash(password, 10);
  const userId = createUser({ email, passwordHash: hash, nombre });
  await createSessionCookie(userId);
  redirect("/onboarding");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Ingresa correo y contraseña." };

  const user = getUserByEmail(email);
  if (!user) return { error: "Correo o contraseña incorrectos." };
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return { error: "Correo o contraseña incorrectos." };

  await createSessionCookie(user.id);
  redirect(user.onboarded === 1 ? "/dashboard" : "/onboarding");
}

export async function logoutAction() {
  await destroySessionCookie();
  redirect("/login");
}

/** Crea una cuenta demo y la deja lista (para el botón "Probar demo"). */
export async function demoLoginAction() {
  const email = "demo@licitapro.cl";
  let user = getUserByEmail(email);
  if (!user) {
    const hash = await bcrypt.hash("demo1234", 10);
    const id = createUser({
      email,
      passwordHash: hash,
      nombre: "Camila Rojas",
      empresa: "Innova Suministros SpA",
    });
    const { completeOnboarding } = await import("@/lib/db");
    completeOnboarding(id, {
      empresa: "Innova Suministros SpA",
      rut: "76.543.210-9",
      rubros: ["Tecnología", "Servicios Generales", "Electricidad e Iluminación"],
      regiones: ["Metropolitana", "Valparaíso", "Biobío"],
    });
    user = getUserById(id);
  }
  if (user) await createSessionCookie(user.id);
  redirect("/dashboard");
}

export async function requireUserId(): Promise<number> {
  const uid = await getSessionUserId();
  if (!uid) redirect("/login");
  return uid;
}
