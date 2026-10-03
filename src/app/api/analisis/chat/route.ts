import { currentUser } from "@/lib/current-user";
import { iaDisponible, preguntar } from "@/lib/ia";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

interface Body {
  fileId?: string;
  ficha?: string;
  historial?: { rol: "user" | "ia"; txt: string }[];
  pregunta?: string;
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sesión expirada." }, { status: 401 });
  if (!user.capacidades.includes("analisis_ia")) {
    return Response.json({ error: "Tu plan no incluye análisis con IA." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const pregunta = String(body.pregunta ?? "").trim().slice(0, 1000);
  if (!pregunta) return Response.json({ error: "Escribe una pregunta." }, { status: 400 });

  if (!iaDisponible()) {
    return Response.json({
      respuesta:
        "Modo demostración: según las bases, el criterio económico pondera 40%, la experiencia 35% y el cumplimiento técnico 25%. Configura ANTHROPIC_API_KEY para respuestas reales sobre tus documentos.",
    });
  }

  const fileId = body.fileId && /^file_[A-Za-z0-9_-]{6,}$/.test(body.fileId) ? body.fileId : undefined;
  const ficha = body.ficha ? String(body.ficha).slice(0, 30_000) : undefined;
  if (!fileId && !ficha) return Response.json({ error: "Primero analiza unas bases." }, { status: 400 });

  const historial = Array.isArray(body.historial)
    ? body.historial
        .filter((m) => m && (m.rol === "user" || m.rol === "ia") && typeof m.txt === "string")
        .map((m) => ({ rol: m.rol, txt: m.txt.slice(0, 4000) }))
    : [];

  try {
    const respuesta = await preguntar({
      fileId,
      ficha,
      historial,
      pregunta,
      perfil: { empresa: user.empresa, rubros: user.rubros, regiones: user.regiones, keywords: user.keywords },
    });
    return Response.json({ respuesta });
  } catch (e) {
    console.error("[analisis/chat]", e);
    return Response.json({ error: "La IA no está disponible en este momento." }, { status: 502 });
  }
}
