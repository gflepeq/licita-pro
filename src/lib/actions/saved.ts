"use server";

import { revalidatePath } from "next/cache";
import { toggleSaved, listSavedCodes } from "@/lib/db";
import { requireUserId } from "@/lib/actions/auth";
import { currentUser } from "@/lib/current-user";
import type { Licitacion } from "@/lib/data";

// Límite de oportunidades guardadas para planes sin "guardadas_ilimitadas".
const LIMITE_GUARDADAS = 15;

export async function toggleSavedAction(
  licitacion: Licitacion
): Promise<{ saved: boolean; limit?: boolean }> {
  const uid = await requireUserId();
  const user = await currentUser();
  const ilimitado = user?.capacidades.includes("guardadas_ilimitadas") ?? true;

  const codes = await listSavedCodes(uid);
  const yaGuardado = codes.includes(licitacion.codigo);

  // Bloquea solo cuando se intenta AGREGAR y se superó el límite.
  if (!yaGuardado && !ilimitado && codes.length >= LIMITE_GUARDADAS) {
    return { saved: false, limit: true };
  }

  const result = await toggleSaved(uid, licitacion.codigo, licitacion);
  revalidatePath("/dashboard/oportunidades");
  return { saved: result };
}
