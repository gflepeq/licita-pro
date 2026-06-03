"use server";

import { revalidatePath } from "next/cache";
import { toggleSaved } from "@/lib/db";
import { requireUserId } from "@/lib/actions/auth";
import type { Licitacion } from "@/lib/data";

export async function toggleSavedAction(licitacion: Licitacion): Promise<boolean> {
  const uid = await requireUserId();
  const result = toggleSaved(uid, licitacion.codigo, licitacion);
  revalidatePath("/dashboard/oportunidades");
  return result;
}
