"use server";

import {
  getCompraAgilDetalle,
  getLicitacionDetalle,
  type CompraAgilDetalle,
  type LicitacionDetalle,
} from "@/lib/mercadopublico";
import { requireUserId } from "@/lib/actions/auth";

export async function compraAgilDetalleAction(
  codigo: string
): Promise<CompraAgilDetalle | null> {
  await requireUserId();
  return getCompraAgilDetalle(codigo);
}

export async function licitacionDetalleAction(
  codigo: string
): Promise<LicitacionDetalle | null> {
  await requireUserId();
  return getLicitacionDetalle(codigo);
}
