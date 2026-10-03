"use server";

import { getCompraAgilDetalle, type CompraAgilDetalle } from "@/lib/mercadopublico";
import { getOportunidad } from "@/lib/oportunidades";
import { requireUserId } from "@/lib/actions/auth";
import { currentUser } from "@/lib/current-user";
import type { Licitacion } from "@/lib/data";

export async function compraAgilDetalleAction(
  codigo: string
): Promise<CompraAgilDetalle | null> {
  await requireUserId();
  return getCompraAgilDetalle(codigo);
}

/** Ficha completa desde el catálogo sincronizado (incluye productos). */
export async function oportunidadDetalleAction(codigo: string): Promise<Licitacion | null> {
  await requireUserId();
  const user = await currentUser();
  return getOportunidad(codigo, user?.rubros ?? []);
}
