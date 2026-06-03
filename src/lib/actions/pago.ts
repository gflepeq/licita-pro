"use server";

import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { createPaymentRow, setPaymentEstado } from "@/lib/db";
import { flowConfigured, flowCreatePayment } from "@/lib/flow";
import { PLANES } from "@/lib/planes";
import { SITE } from "@/lib/site";

export type PagoState = { error?: string } | undefined;

export async function iniciarPagoAction(
  _prev: PagoState,
  formData: FormData
): Promise<PagoState> {
  const user = await currentUser();
  if (!user) redirect("/login");

  const planId = String(formData.get("plan") ?? "");
  const plan = PLANES.find((p) => p.id === planId);
  if (!plan) return { error: "Plan no válido." };
  if (plan.precio <= 0) return { error: "Este plan no requiere pago." };

  if (!flowConfigured()) {
    return {
      error:
        "Los pagos aún no están configurados. Define FLOW_API_KEY y FLOW_SECRET_KEY.",
    };
  }

  // Registra el pago como pendiente y usa su id como orden de comercio.
  const pagoId = await createPaymentRow({
    userId: user.id,
    plan: plan.id,
    monto: plan.precio,
  });

  const result = await flowCreatePayment({
    commerceOrder: String(pagoId),
    subject: `Suscripción ${plan.nombre} — ${SITE.name}`,
    amount: plan.precio,
    email: user.email,
  });

  if ("error" in result) {
    await setPaymentEstado(pagoId, "fallido");
    return { error: result.error };
  }

  redirect(result.redirectUrl);
}
