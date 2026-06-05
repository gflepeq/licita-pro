import { NextResponse } from "next/server";

// Diagnóstico temporal de conexión a la base. Eliminar tras depurar.
export async function GET() {
  try {
    const { getPlanes } = await import("@/lib/db");
    const planes = await getPlanes({ all: true });
    return NextResponse.json({ ok: true, planes: planes.length });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        name: e instanceof Error ? e.name : undefined,
      },
      { status: 200 }
    );
  }
}
