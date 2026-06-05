import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileSearch,
  LineChart,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Trophy,
  Upload,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Faq } from "@/components/faq";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { getPlanes } from "@/lib/db";
import { fmtCLP } from "@/lib/data";
import { capacidadLabel } from "@/lib/capacidades";
import { PLANES_SEED } from "@/lib/planes";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <AnnouncementBanner className="mx-auto max-w-6xl px-4 pt-4 sm:px-6" />
        <Hero />
        <LogosBar />
        <Problema />
        <Soluciones />
        <ComoFunciona />
        <Testimonios />
        <Precios />
        <FaqSection />
        <CtaFinal />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles size={14} /> Detección de licitaciones con inteligencia artificial
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl md:text-6xl">
            Gana más licitaciones del Estado,{" "}
            <span className="text-brand-600">sin perder horas buscando</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Licitapro detecta automáticamente las licitaciones públicas y
            Compras Ágiles de Mercado Público relevantes para tu empresa, y
            analiza las bases con IA en segundos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-700"
            >
              Probar 7 días por $4.990 <ArrowRight size={18} />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-surface"
            >
              Ver cómo funciona
            </a>
          </div>
          <p className="mt-4 text-xs text-muted">
            Sin permanencia · Cancela cuando quieras · Datos oficiales de ChileCompra
          </p>
        </div>

        {/* Mockup del panel */}
        <div className="mx-auto mt-14 max-w-4xl animate-float-up">
          <div className="rounded-2xl border border-line bg-card p-2 shadow-2xl shadow-brand-900/10">
            <div className="rounded-xl bg-surface p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">
                  Oportunidades detectadas hoy
                </p>
                <span className="rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-semibold text-accent-600">
                  47 nuevas
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  { n: "Suministro de luminarias LED — Municipalidad de Maipú", s: 96, m: "$184.500.000" },
                  { n: "Equipos computacionales — Servicio de Impuestos Internos", s: 91, m: "$23.900.000" },
                  { n: "Aseo de áreas verdes — Municipalidad de Valparaíso", s: 88, m: "$312.000.000" },
                ].map((o, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3"
                  >
                    <ScoreRing score={o.s} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{o.n}</p>
                      <p className="text-xs text-muted">Monto estimado {o.m}</p>
                    </div>
                    <span className="hidden rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 sm:inline">
                      Ver bases
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 90 ? "text-accent-500" : score >= 75 ? "text-brand-500" : "text-amber-500";
  return (
    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-current/10 ${color}`}>
      <span className="text-sm font-bold">{score}</span>
    </div>
  );
}

/* ---------------- Logos ---------------- */
function LogosBar() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted">
          Empresas que ya venden al Estado con Licitapro
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-base font-bold text-slate-400">
          <span>Innova Suministros</span>
          <span>TecnoAndes</span>
          <span>Clean&Green</span>
          <span>MediQuote</span>
          <span>Constructora Aysén</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Problema ---------------- */
function Problema() {
  const dolores = [
    {
      icon: Clock,
      t: "2 a 4 horas semanales perdidas",
      d: "Revisar Mercado Público a mano cada día es tedioso y te quita tiempo para vender.",
    },
    {
      icon: Search,
      t: "Oportunidades que nunca ves",
      d: "Las búsquedas por palabra clave dejan fuera licitaciones relevantes para tu rubro.",
    },
    {
      icon: FileSearch,
      t: "Bases largas y confusas",
      d: "Leer decenas de páginas para saber si conviene postular consume días de trabajo.",
    },
  ];
  return (
    <section id="problema" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600">El problema</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Vender al Estado no debería ser un trabajo de tiempo completo
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {dolores.map((d) => (
            <div
              key={d.t}
              className="rounded-2xl border border-line bg-card p-6 shadow-sm"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-500">
                <d.icon size={22} />
              </div>
              <h3 className="mt-4 font-semibold text-ink">{d.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Soluciones ---------------- */
function Soluciones() {
  const features = [
    {
      icon: BrainCircuit,
      t: "Detección semántica con IA",
      d: "Un motor de IA analiza diariamente todas las publicaciones y te entrega solo las oportunidades relevantes para tu negocio, con un score de relevancia.",
    },
    {
      icon: FileSearch,
      t: "Análisis de bases en segundos",
      d: "Sube el PDF de las bases y obtén al instante certificados requeridos, plazos clave, criterios de evaluación y una evaluación de viabilidad.",
    },
    {
      icon: Bell,
      t: "Alertas diarias y por WhatsApp",
      d: "Recibe las oportunidades relevantes en tu correo y WhatsApp. Nunca más te enteres tarde de una licitación.",
    },
    {
      icon: MessageCircle,
      t: "Asistente IA para tus dudas",
      d: "Hazle preguntas a la IA sobre cualquier licitación y resuelve dudas sin leer todo el documento.",
    },
    {
      icon: Trophy,
      t: "Seguimiento de adjudicaciones",
      d: "Cada semana recibes un resumen con las adjudicaciones de las licitaciones y cotizaciones que seguiste.",
    },
    {
      icon: LineChart,
      t: "Borradores de cotización",
      d: "Genera borradores de cotización para acelerar tus postulaciones (planes superiores).",
    },
  ];
  return (
    <section id="soluciones" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600">Soluciones</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Toda tu gestión de licitaciones en un solo lugar
          </h2>
          <p className="mt-4 text-lg text-muted">
            Desde la detección automática hasta el seguimiento de la
            adjudicación, con IA en cada paso.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.t}
              className="group rounded-2xl border border-line bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <f.icon size={22} />
              </div>
              <h3 className="mt-4 font-semibold text-ink">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Cómo funciona ---------------- */
function ComoFunciona() {
  const pasos = [
    {
      icon: Sparkles,
      t: "Configura tu perfil",
      d: "Cuéntanos qué vende tu empresa y en qué regiones. La IA aprende tu rubro en minutos.",
    },
    {
      icon: Bell,
      t: "Recibe oportunidades",
      d: "Cada día te llegan las licitaciones y Compras Ágiles relevantes, priorizadas por score.",
    },
    {
      icon: Upload,
      t: "Analiza y postula",
      d: "Sube las bases, evalúa la viabilidad con IA y prepara tu postulación con confianza.",
    },
  ];
  return (
    <section id="como-funciona" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600">Cómo funciona</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Empieza a detectar oportunidades en 3 pasos
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {pasos.map((p, i) => (
            <div key={p.t} className="relative text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
                <p.icon size={26} />
              </div>
              <span className="mt-4 inline-block text-xs font-bold uppercase tracking-wider text-brand-600">
                Paso {i + 1}
              </span>
              <h3 className="mt-1 text-lg font-semibold text-ink">{p.t}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
                {p.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Testimonios ---------------- */
function Testimonios() {
  const t = [
    {
      q: "Pasamos de revisar Mercado Público a mano a recibir solo lo que nos sirve. Ganamos 3 licitaciones el primer trimestre.",
      n: "Camila Rojas",
      c: "Gerenta Comercial, Innova Suministros",
    },
    {
      q: "El análisis de bases con IA nos ahorra días. En minutos sabemos si conviene postular o no.",
      n: "Rodrigo Fuentes",
      c: "Socio, TecnoAndes SpA",
    },
    {
      q: "Las alertas por WhatsApp son un cambio total. Ya no se nos escapa ninguna oportunidad.",
      n: "Daniela Soto",
      c: "Jefa de Licitaciones, Clean&Green",
    },
  ];
  return (
    <section className="bg-slate-900 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-400">Clientes</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            PYMEs que ya venden más al Estado
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {t.map((item) => (
            <figure
              key={item.n}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-slate-200">
                “{item.q}”
              </blockquote>
              <figcaption className="mt-5">
                <p className="text-sm font-semibold text-white">{item.n}</p>
                <p className="text-xs text-slate-400">{item.c}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Precios ---------------- */
async function Precios() {
  // Fallback a la semilla si la base no está disponible (la landing no debe caerse).
  let dbPlanes;
  try {
    dbPlanes = await getPlanes();
  } catch {
    dbPlanes = PLANES_SEED;
  }
  const planes = dbPlanes.map((p) => ({
    nombre: p.nombre,
    precio: fmtCLP(p.precio),
    periodo: p.periodo,
    destacado: p.destacado,
    features: p.features.map(capacidadLabel),
    cta: `Elegir ${p.nombre}`,
  }));
  return (
    <section id="precios" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600">Precios</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Planes para cada etapa de tu empresa
          </h2>
          <p className="mt-4 text-lg text-muted">
            Empieza con la prueba de 7 días. Sin permanencia.
          </p>
        </div>
        <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
          {planes.map((p) => (
            <div
              key={p.nombre}
              className={`relative rounded-2xl border p-7 ${
                p.destacado
                  ? "border-brand-600 bg-card shadow-xl shadow-brand-600/10 lg:-mt-4 lg:mb-4"
                  : "border-line bg-card shadow-sm"
              }`}
            >
              {p.destacado && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                  Más popular
                </span>
              )}
              <h3 className="font-semibold text-ink">{p.nombre}</h3>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-ink">
                  {p.precio}
                </span>
                <span className="mb-1 text-sm text-muted">{p.periodo}</span>
              </div>
              <Link
                href="/registro"
                className={`mt-6 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition-colors ${
                  p.destacado
                    ? "bg-brand-600 text-white hover:bg-brand-700"
                    : "border border-line text-ink hover:bg-surface"
                }`}
              >
                {p.cta}
              </Link>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-accent-500"
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FaqSection() {
  return (
    <section id="faq" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-600">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="mt-12">
          <Faq />
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA final ---------------- */
function CtaFinal() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-6 py-14 text-center sm:px-12">
          <div className="absolute inset-0 bg-hero-glow opacity-60" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Empieza a detectar oportunidades hoy
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50">
              Prueba Licitapro 7 días por $4.990 y descubre cuántas licitaciones
              estás dejando pasar.
            </p>
            <Link
              href="/registro"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-brand-700 shadow-lg transition-transform hover:scale-[1.02]"
            >
              Probar ahora <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
