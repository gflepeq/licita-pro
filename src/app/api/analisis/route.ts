import { currentUser } from "@/lib/current-user";
import { getLicitacionDetalle } from "@/lib/mercadopublico";
import { analisisDemo, analizar, fichaTexto, iaDisponible, subirPdf } from "@/lib/ia";
import { cacheGet, cacheSet } from "@/lib/db";
import { hoyChile } from "@/lib/data";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_PDF = 4 * 1024 * 1024; // Vercel limita el body a ~4,5 MB
const LIMITE_DIARIO = 25;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sesión expirada." }, { status: 401 });
  if (!user.capacidades.includes("analisis_ia")) {
    return Response.json({ error: "Tu plan no incluye análisis con IA." }, { status: 403 });
  }

  const form = await req.formData();
  const codigo = String(form.get("codigo") ?? "").trim().toUpperCase();
  const pdf = form.get("pdf");
  const file = pdf instanceof File && pdf.size > 0 ? pdf : null;

  if (!codigo && !file) return Response.json({ error: "Sube el PDF de las bases o indica el código del proceso." }, { status: 400 });
  if (file && (file.type !== "application/pdf" || file.size > MAX_PDF)) {
    return Response.json({ error: "El archivo debe ser un PDF de máximo 4 MB." }, { status: 400 });
  }

  // Ficha oficial desde la API (si hay código).
  let ficha: string | undefined;
  let titulo = file?.name.replace(/\.pdf$/i, "") ?? codigo;
  if (codigo) {
    const det = await getLicitacionDetalle(codigo);
    if (det) {
      ficha = fichaTexto(det);
      titulo = det.nombre;
    } else if (!file) {
      return Response.json({ error: `No encontramos la licitación ${codigo} en Mercado Público.` }, { status: 404 });
    }
  }

  if (!iaDisponible()) {
    return Response.json({ analisis: analisisDemo(titulo), ficha, demo: true });
  }

  // Límite diario por usuario (control de costos).
  const key = `ia_uso_${user.id}_${hoyChile()}`;
  const usos = Number((await cacheGet(key)) || 0);
  if (usos >= LIMITE_DIARIO) {
    return Response.json({ error: `Alcanzaste el límite de ${LIMITE_DIARIO} análisis diarios.` }, { status: 429 });
  }

  try {
    const fileId = file ? await subirPdf(file.name, await file.arrayBuffer()) : undefined;
    const analisis = await analizar({
      fileId,
      ficha,
      perfil: { empresa: user.empresa, rubros: user.rubros, regiones: user.regiones, keywords: user.keywords },
    });
    await cacheSet(key, String(usos + 1));
    return Response.json({ analisis, fileId, ficha, demo: false });
  } catch (e) {
    console.error("[analisis]", e);
    return Response.json({ error: "No pudimos analizar el documento. Intenta nuevamente." }, { status: 502 });
  }
}
