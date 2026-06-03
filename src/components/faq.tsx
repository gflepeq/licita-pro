"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "¿De dónde provienen las licitaciones?",
    a: "Monitoreamos diariamente todas las publicaciones de Mercado Público (ChileCompra), incluyendo licitaciones públicas y Compras Ágiles, en todas las regiones del país.",
  },
  {
    q: "¿Cómo decide la IA qué oportunidades son relevantes para mí?",
    a: "Usamos un motor semántico que entiende el rubro, productos y servicios de tu empresa, más allá de simples palabras clave. A cada oportunidad le asignamos un score de relevancia para que priorices lo importante.",
  },
  {
    q: "¿Puedo recibir alertas por WhatsApp?",
    a: "Sí. Además del panel y los correos diarios, puedes activar alertas por WhatsApp para enterarte de las oportunidades relevantes sin entrar a la plataforma.",
  },
  {
    q: "¿Qué incluye el análisis de bases con IA?",
    a: "Cargas el PDF de las bases y en segundos obtienes los certificados requeridos, plazos clave, criterios de evaluación y una evaluación de viabilidad para postular. También puedes hacerle preguntas al asistente IA.",
  },
  {
    q: "¿Necesito tarjeta para la prueba?",
    a: "La prueba de 7 días tiene un valor único de $4.990 y te da acceso completo a la plataforma. Puedes cancelar cuando quieras.",
  },
  {
    q: "¿Para qué tamaño de empresa sirve?",
    a: "Está pensado para empresas de 2 a 50 personas que ya venden o quieren vender a organismos públicos, municipios y servicios del Estado.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-2xl border border-line bg-card">
      {faqs.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="font-semibold text-ink">{item.q}</span>
              <ChevronDown
                size={20}
                className={`shrink-0 text-muted transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <p className="px-6 pb-5 text-sm leading-relaxed text-muted">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
