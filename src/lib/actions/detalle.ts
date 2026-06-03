"use server";

import { getCompraAgilDetalle, type CompraAgilDetalle } from "@/lib/mercadopublico";
import { requireUserId } from "@/lib/actions/auth";

export async function compraAgilDetalleAction(
  codigo: string
): Promise<CompraAgilDetalle | null> {
  await requireUserId();
  return getCompraAgilDetalle(codigo);
}
