import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { cacheGet, cacheSet } from "@/lib/db";
import type { Licitacion } from "@/lib/data";

// Análisis de oportunidades con Claude. Requiere ANTHROPIC_API_KEY en el servidor.
const MODEL = "claude-opus-5-5";
// Fallback del lado del servidor si el modelo declina por política (opt-in recomendado).
const BETAS = ["server-side-fallback-2026-07-01"];

export const iaDisponible = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export const AnalisisSchema = z.object({
  resumen: z.string().describe("Qué compra el organismo y para qué, en 2-4 oraciones claras."),
  viabilidad: z.number().int().min(0).max(100).describe("Qué tan conveniente es postular para ESTA empresa (0-100)."),
  veredicto: z.enum(["Postular", "Evaluar", "No conviene"]),
  razones: z.array(z.string()).describe("3-5 razones concretas detrás del puntaje de viabilidad."),
  requisitos: z
    .array(z.object({ requisito: z.string(), detalle: z.string() }))
    .describe("Requisitos y documentos que probablemente pidan las bases, según el tipo de compra."),
  riesgos: z.array(z.string()).describe("Riesgos o puntos a revisar antes de ofertar."),
  fechas: z.array(z.object({ hito: z.string(), fecha: z.string() })).describe("Hitos con fecha, tomados de los datos."),
  estrategia: z.string().describe("Recomendación práctica para armar una oferta competitiva."),
  preguntas: z.array(z.string()).describe("3 preguntas útiles que el usuario podría hacer a continuación."),
});
export type Analisis = z.infer<typeof AnalisisSchema>;

export interface PerfilEmpresa {
  empresa: string;
  rubros: string[];
  regiones: string[];
}

const SYSTEM = `Eres un asesor experto en compras públicas de Chile (Mercado Público / ChileCompra, Ley 19.886 y su reglamento, Compra Ágil, licitaciones L1/LE/LP/LQ/LR).
Ayudas a PYMEs proveedoras del Estado a decidir si postular y cómo preparar su oferta.
Trabaja solo con los datos entregados: si algo no está en ellos (por ejemplo el contenido de las bases o anexos), dilo y márcalo como "a confirmar en las bases"; no inventes montos, plazos ni requisitos específicos.
Escribe en español de Chile, claro y directo, sin relleno.`;

function fichaTexto(l: Licitacion): string {
  const items = (l.items ?? [])
    .slice(0, 40)
    .map((i) => `- ${i.cantidad} ${i.unidad} · ${i.nombre}${i.descripcion ? ` (${i.descripcion})` : ""}`)
    .join("\n");
  return [
    `Código: ${l.codigo}`,
    `Tipo: ${l.tipo}${l.tipoLic ? ` ${l.tipoLic}` : ""}`,
    `Nombre: ${l.nombre}`,
    `Organismo: ${l.organismo}${l.unidad ? ` — ${l.unidad}` : ""}`,
    `Región: ${l.region}`,
    `Monto: ${l.monto > 0 ? `$${l.monto.toLocaleString("es-CL")} CLP` : "no publicado"}`,
    `Publicada: ${l.publicada || "—"}`,
    `Cierre de ofertas: ${l.cierreHora || l.cierre || "—"}`,
    l.categorias?.length ? `Categorías UNSPSC: ${l.categorias.join("; ")}` : "",
    l.descripcion ? `Descripción:\n${l.descripcion}` : "",
    items ? `Productos/servicios solicitados:\n${items}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function perfilTexto(p: PerfilEmpresa): string {
  return `Empresa: ${p.empresa || "(sin nombre)"}\nRubros: ${p.rubros.join(", ") || "no definidos"}\nRegiones donde opera: ${
    p.regiones.join(", ") || "no definidas"
  }`;
}

/** Análisis estructurado de una oportunidad para el perfil de la empresa (cacheado 24 h). */
export async function analizarOportunidad(l: Licitacion, perfil: PerfilEmpresa): Promise<Analisis> {
  const clave = `ia_${l.codigo}_${[perfil.empresa, ...perfil.rubros, ...perfil.regiones].join("|")}`.slice(0, 250);
  const cache = await cacheGet(clave).catch(() => null);
  if (cache) {
    const c = JSON.parse(cache) as { ts: number; a: Analisis };
    if (Date.now() - c.ts < 24 * 3600_000) return c.a;
  }

  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(AnalisisSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Analiza esta oportunidad para mi empresa.\n\n## Oportunidad\n${fichaTexto(l)}\n\n## Mi empresa\n${perfilTexto(perfil)}`,
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    throw new Error("La IA no pudo analizar esta oportunidad. Intenta nuevamente.");
  }
  await cacheSet(clave, JSON.stringify({ ts: Date.now(), a: res.parsed_output })).catch(() => {});
  return res.parsed_output;
}

export type Turno = { rol: "user" | "ia"; txt: string };

/** Pregunta de seguimiento sobre la misma oportunidad. */
export async function preguntarOportunidad(
  l: Licitacion,
  perfil: PerfilEmpresa,
  historial: Turno[],
  pregunta: string
): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Contexto para mis preguntas.\n\n## Oportunidad\n${fichaTexto(l)}\n\n## Mi empresa\n${perfilTexto(perfil)}`,
    },
    { role: "assistant", content: "Entendido. ¿Qué quieres saber de esta oportunidad?" },
    ...historial.slice(-10).map((t) => ({
      role: t.rol === "user" ? ("user" as const) : ("assistant" as const),
      content: t.txt,
    })),
    { role: "user", content: pregunta },
  ];
  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "low" },
    system: `${SYSTEM}\nResponde en máximo 150 palabras, en texto plano (sin markdown).`,
    messages,
  });
  if (res.stop_reason === "refusal") return "No puedo responder esa pregunta. Prueba reformulándola.";
  return res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
