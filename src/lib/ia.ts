import "server-only";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import type { LicitacionDetalle } from "@/lib/mercadopublico";
import { fmtMonto } from "@/lib/data";

// Análisis de bases de licitación con Claude.
// Requiere ANTHROPIC_API_KEY; sin ella se devuelve un análisis de demostración.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export const iaDisponible = () => !!process.env.ANTHROPIC_API_KEY;

export interface Analisis {
  titulo: string;
  viabilidad: number; // 0-100
  nivel: "Alta" | "Media" | "Baja";
  resumen: string;
  requisitos: { texto: string; estado: "cumple" | "verificar" | "riesgo" }[];
  plazos: { hito: string; fecha: string }[];
  criterios: { criterio: string; ponderacion: string }[];
  garantias: string[];
  riesgos: string[];
  recomendaciones: string[];
  preguntas: string[];
}

export interface PerfilEmpresa {
  empresa: string;
  rubros: string[];
  regiones: string[];
  keywords: string[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["titulo", "viabilidad", "nivel", "resumen", "requisitos", "plazos", "criterios", "garantias", "riesgos", "recomendaciones", "preguntas"],
  properties: {
    titulo: { type: "string", description: "Nombre corto del proceso de compra" },
    viabilidad: { type: "integer", description: "0 a 100: conveniencia de postular para esta empresa" },
    nivel: { type: "string", enum: ["Alta", "Media", "Baja"] },
    resumen: { type: "string", description: "3-4 frases: qué se compra, monto, plazo y si conviene postular" },
    requisitos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["texto", "estado"],
        properties: {
          texto: { type: "string" },
          estado: { type: "string", enum: ["cumple", "verificar", "riesgo"] },
        },
      },
    },
    plazos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["hito", "fecha"],
        properties: { hito: { type: "string" }, fecha: { type: "string" } },
      },
    },
    criterios: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["criterio", "ponderacion"],
        properties: { criterio: { type: "string" }, ponderacion: { type: "string" } },
      },
    },
    garantias: { type: "array", items: { type: "string" } },
    riesgos: { type: "array", items: { type: "string" } },
    recomendaciones: { type: "array", items: { type: "string" } },
    preguntas: { type: "array", items: { type: "string" }, description: "3 preguntas útiles que el usuario podría hacer sobre las bases" },
  },
} as const;

const SYSTEM = `Eres un analista experto en compras públicas de Chile (Ley 19.886, Mercado Público / ChileCompra).
Ayudas a PYMEs proveedoras del Estado a decidir si postular a una licitación o Compra Ágil y a preparar su oferta.
Responde siempre en español de Chile, claro y concreto. Basa todo en la información entregada (bases, ficha y perfil de la empresa);
si un dato no aparece, dilo explícitamente en vez de inventarlo. Para cada requisito indica "cumple" solo si el perfil lo respalda,
"verificar" si la empresa debe confirmarlo y "riesgo" si probablemente no lo cumpla o es exigente.`;

function perfilTexto(p: PerfilEmpresa) {
  return `Perfil de la empresa:
- Nombre: ${p.empresa || "No informado"}
- Rubros: ${p.rubros.join(", ") || "No informados"}
- Palabras clave (productos/servicios): ${p.keywords.join(", ") || "No informadas"}
- Regiones donde opera: ${p.regiones.join(", ") || "No informadas"}`;
}

/** Ficha de la licitación (desde la API) como texto para el modelo. */
export function fichaTexto(d: LicitacionDetalle): string {
  const items = d.items
    .slice(0, 60)
    .map((i) => `  - ${i.cantidad} ${i.unidad} · ${i.producto}${i.descripcion ? ` — ${i.descripcion}` : ""}`)
    .join("\n");
  return `Ficha oficial de Mercado Público
Código: ${d.codigo}
Nombre: ${d.nombre}
Tipo: ${d.tipo}
Estado: ${d.estado}
Organismo: ${d.organismo}${d.unidad ? ` (${d.unidad})` : ""} — ${d.comuna ? `${d.comuna}, ` : ""}${d.region}
Monto estimado: ${d.montoVisible ? fmtMonto(d.monto, d.moneda) : "No publicado"}
Duración del contrato: ${d.contrato || "No informada"}
Fechas: ${d.fechas.map((f) => `${f.label}: ${f.fecha}${f.hora ? ` ${f.hora}` : ""}`).join(" | ")}
Descripción: ${d.descripcion || "—"}
Ítems:
${items || "  (sin detalle de ítems)"}`;
}

function client() {
  return new Anthropic();
}

function textoDe(msg: Anthropic.Beta.BetaMessage): string {
  return msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** Sube el PDF a la Files API (para reutilizarlo en el chat sin reenviarlo). */
export async function subirPdf(nombre: string, data: ArrayBuffer): Promise<string> {
  const meta = await client().files.upload({
    file: await toFile(Buffer.from(data), nombre, { type: "application/pdf" }),
    expires_in_seconds: 7 * 24 * 3600,
  });
  return meta.id;
}

function contenido(opts: { fileId?: string; ficha?: string }, pregunta: string): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (opts.fileId) {
    blocks.push({
      type: "document",
      source: { type: "file", file_id: opts.fileId },
      title: "Bases de la licitación",
      cache_control: { type: "ephemeral" },
    });
  }
  if (opts.ficha) blocks.push({ type: "text", text: opts.ficha });
  blocks.push({ type: "text", text: pregunta });
  return blocks;
}

export async function analizar(opts: {
  fileId?: string;
  ficha?: string;
  perfil: PerfilEmpresa;
}): Promise<Analisis> {
  const msg = await client()
    .beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: contenido(
            opts,
            `${perfilTexto(opts.perfil)}

Analiza este proceso de compra para la empresa. Extrae requisitos de admisibilidad y técnicos, documentos y certificados exigidos,
plazos clave, criterios de evaluación con su ponderación, garantías (seriedad y fiel cumplimiento), multas o riesgos relevantes,
y entrega recomendaciones concretas para preparar una oferta competitiva.`
          ),
        },
      ],
    })
    .finalMessage();

  if (msg.stop_reason === "refusal") throw new Error("La IA no pudo analizar este documento.");
  const parsed = JSON.parse(textoDe(msg)) as Analisis;
  parsed.viabilidad = Math.max(0, Math.min(100, Math.round(parsed.viabilidad)));
  return parsed;
}

export async function preguntar(opts: {
  fileId?: string;
  ficha?: string;
  perfil: PerfilEmpresa;
  historial: { rol: "user" | "ia"; txt: string }[];
  pregunta: string;
}): Promise<string> {
  // El primer turno lleva el documento/ficha (cacheado); luego la conversación.
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: contenido(opts, `${perfilTexto(opts.perfil)}\n\nVoy a hacerte preguntas sobre este proceso de compra.`),
    },
    { role: "assistant", content: "Perfecto, ya revisé el proceso. ¿Qué necesitas saber?" },
    ...opts.historial.slice(-10).map(
      (m): Anthropic.Beta.BetaMessageParam => ({ role: m.rol === "user" ? "user" : "assistant", content: m.txt })
    ),
    { role: "user", content: opts.pregunta },
  ];
  // La API exige alternancia: fusiona turnos consecutivos del mismo rol.
  const merged: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of messages) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role && typeof prev.content === "string" && typeof m.content === "string") {
      prev.content = `${prev.content}\n\n${m.content}`;
    } else merged.push({ ...m });
  }

  const msg = await client()
    .beta.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: `${SYSTEM}\nResponde en máximo 6 frases o una lista breve. Cita la sección de las bases cuando sea posible.`,
      output_config: { effort: "low" },
      messages: merged,
    })
    .finalMessage();
  if (msg.stop_reason === "refusal") return "No puedo responder esa pregunta sobre este documento.";
  return textoDe(msg).trim() || "No encontré esa información en las bases.";
}

/** Análisis de ejemplo (sin API key configurada). */
export function analisisDemo(titulo = "Suministro e instalación de luminarias LED"): Analisis {
  return {
    titulo,
    viabilidad: 82,
    nivel: "Alta",
    resumen:
      "Demostración: licitación de suministro e instalación de luminarias LED para alumbrado público. El presupuesto y los plazos son compatibles con tu perfil. Requiere experiencia comprobable en proyectos similares y certificación SEC vigente. Configura ANTHROPIC_API_KEY para analizar bases reales.",
    requisitos: [
      { texto: "Certificado de inscripción SEC vigente", estado: "cumple" },
      { texto: "Inscripción vigente en el Registro de Proveedores", estado: "cumple" },
      { texto: "Experiencia en 2 proyectos similares (últimos 3 años)", estado: "verificar" },
      { texto: "Certificado de antecedentes laborales (F30-1)", estado: "cumple" },
      { texto: "Garantía técnica de 5 años sobre luminarias", estado: "riesgo" },
    ],
    plazos: [
      { hito: "Cierre de recepción de ofertas", fecha: "12 jun 2026, 15:00" },
      { hito: "Apertura técnica y económica", fecha: "13 jun 2026, 10:00" },
      { hito: "Adjudicación estimada", fecha: "27 jun 2026" },
      { hito: "Plazo de ejecución", fecha: "90 días corridos" },
    ],
    criterios: [
      { criterio: "Oferta económica", ponderacion: "40%" },
      { criterio: "Experiencia del oferente", ponderacion: "35%" },
      { criterio: "Calidad técnica", ponderacion: "20%" },
      { criterio: "Cumplimiento de requisitos formales", ponderacion: "5%" },
    ],
    garantias: ["Seriedad de la oferta: 3% del monto, vigencia 90 días", "Fiel cumplimiento: 5% del contrato"],
    riesgos: ["Multas de 1‰ por día de atraso en la instalación", "Plazo de ejecución exigente para el volumen solicitado"],
    recomendaciones: [
      "Adjunta certificados de recepción conforme de proyectos similares para maximizar el puntaje de experiencia.",
      "Cotiza la garantía de 5 años con tu proveedor antes de ofertar.",
      "Haz preguntas en el foro antes del cierre de consultas sobre la ponderación de experiencia.",
    ],
    preguntas: [
      "¿Cuál es el criterio de evaluación con mayor ponderación?",
      "¿Qué pasa si no tengo la experiencia mínima requerida?",
      "¿El IVA está incluido en el presupuesto?",
    ],
  };
}
