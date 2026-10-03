import { refreshPool } from "@/lib/mercadopublico";
import { detallePurge } from "@/lib/db";

// Sincroniza las oportunidades de Mercado Público (enriquece detalles pendientes).
// Llamar periódicamente (Vercel Cron o cron-job.org) con:
//   Authorization: Bearer <CRON_SECRET>
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const r = await refreshPool(50_000);
  try {
    await detallePurge(60);
  } catch {}
  return Response.json(r);
}
