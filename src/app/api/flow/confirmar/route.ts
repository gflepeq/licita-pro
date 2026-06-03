import { NextResponse, type NextRequest } from "next/server";
import { flowGetStatus } from "@/lib/flow";
import { getPaymentById, setPaymentEstado, setUserPlan } from "@/lib/db";

// Confirmación servidor-a-servidor de Flow (urlConfirmation).
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const token = String(form.get("token") ?? "");
    if (!token) return NextResponse.json({ ok: false }, { status: 400 });

    const status = await flowGetStatus(token);
    if (!status) return NextResponse.json({ ok: false }, { status: 200 });

    const pago = await getPaymentById(Number(status.commerceOrder));
    if (pago) {
      if (status.status === 2) {
        await setPaymentEstado(pago.id, "pagado");
        await setUserPlan(pago.userId, pago.plan); // activa el plan
      } else if (status.status === 3 || status.status === 4) {
        await setPaymentEstado(pago.id, "fallido");
      }
    }
    // Flow espera HTTP 200.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
