// TEMPORAL: verifica la migración a Elestio. Solo devuelve conteos de filas.
import { tableCounts } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ ok: true, counts: await tableCounts() });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error).message) }, { status: 500 });
  }
}
