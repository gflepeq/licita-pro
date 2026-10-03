"use server";

import { currentUser } from "@/lib/current-user";
import { getOportunidad } from "@/lib/oportunidades";
import {
  analizarOportunidad,
  iaDisponible,
  preguntarOportunidad,
  type Analisis,
  type Turno,
} from "@/lib/ia";

type Res<T> = { ok: true; data: T } | { ok: false; error: string };

async function contexto(codigo: string) {
  const user = await currentUser();
  if (!user) throw new Error("Sesión expirada. Vuelve a ingresar.");
  if (!user.capacidades.includes("analisis_ia")) throw new Error("Tu plan no incluye análisis con IA.");
  if (!iaDisponible()) throw new Error("El análisis con IA aún no está configurado en el servidor.");
  const l = await getOportunidad(codigo, user.rubros);
  if (!l) throw new Error("No encontramos esa oportunidad en el catálogo.");
  return { l, perfil: { empresa: user.empresa, rubros: user.rubros, regiones: user.regiones } };
}

export async function analizarAction(codigo: string): Promise<Res<Analisis>> {
  try {
    const { l, perfil } = await contexto(codigo);
    return { ok: true, data: await analizarOportunidad(l, perfil) };
  } catch (e) {
    console.error("[ia] analizar", e);
    return { ok: false, error: e instanceof Error ? e.message : "Error al analizar." };
  }
}

export async function preguntarAction(
  codigo: string,
  historial: Turno[],
  pregunta: string
): Promise<Res<string>> {
  try {
    const q = pregunta.trim().slice(0, 1000);
    if (!q) return { ok: false, error: "Escribe una pregunta." };
    const { l, perfil } = await contexto(codigo);
    return { ok: true, data: await preguntarOportunidad(l, perfil, historial, q) };
  } catch (e) {
    console.error("[ia] preguntar", e);
    return { ok: false, error: e instanceof Error ? e.message : "Error al responder." };
  }
}
