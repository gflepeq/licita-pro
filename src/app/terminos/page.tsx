import type { Metadata } from "next";
import { LegalPage, Seccion } from "@/components/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Términos y condiciones — ${SITE.name}`,
  description: `Términos y condiciones de uso de ${SITE.name}.`,
};

export default function TerminosPage() {
  return (
    <LegalPage titulo="Términos y condiciones" actualizado="junio 2026">
      <p>
        Estos términos regulan el uso de la plataforma {SITE.name} (
        {SITE.domain}), operada por {SITE.legalName}. Al crear una cuenta o usar
        el servicio, aceptas estos términos.
      </p>

      <Seccion titulo="1. Descripción del servicio">
        <p>
          {SITE.name} es una plataforma SaaS que detecta y organiza
          oportunidades de negocio publicadas en Mercado Público (ChileCompra) —
          licitaciones y Compras Ágiles — y entrega herramientas de búsqueda,
          alertas y análisis con inteligencia artificial. {SITE.name} es un
          servicio independiente y no está afiliado ni patrocinado por
          ChileCompra ni por el Estado de Chile.
        </p>
      </Seccion>

      <Seccion titulo="2. Fuente de los datos">
        <p>
          La información de oportunidades proviene de las APIs y datos públicos
          de Mercado Público. {SITE.name} procesa y presenta esos datos, pero no
          garantiza su exactitud, completitud ni disponibilidad en todo momento.
          La información oficial y vinculante es siempre la publicada en
          mercadopublico.cl.
        </p>
      </Seccion>

      <Seccion titulo="3. Cuenta y uso aceptable">
        <p>
          Eres responsable de la confidencialidad de tus credenciales y de la
          actividad de tu cuenta. Te comprometes a no usar la plataforma para
          fines ilícitos, ni a intentar vulnerar su seguridad, extraer datos de
          forma masiva o automatizada sin autorización, o afectar su normal
          funcionamiento.
        </p>
      </Seccion>

      <Seccion titulo="4. Planes y pagos">
        <p>
          Ofrecemos planes de pago según el detalle vigente en la sección de
          precios. Las suscripciones se renuevan según el periodo contratado y
          pueden cancelarse en cualquier momento, surtiendo efecto al término
          del periodo pagado. Los valores se expresan en pesos chilenos (CLP) e
          incluyen los impuestos que correspondan.
        </p>
      </Seccion>

      <Seccion titulo="5. Limitación de responsabilidad">
        <p>
          {SITE.name} se entrega &ldquo;tal cual&rdquo;. No respondemos por
          decisiones comerciales tomadas a partir de la información mostrada, ni
          por la pérdida de oportunidades derivada de interrupciones del servicio
          o de la API de origen. Nuestra responsabilidad total se limita al
          monto pagado por el usuario en los últimos 3 meses.
        </p>
      </Seccion>

      <Seccion titulo="6. Modificaciones">
        <p>
          Podemos actualizar estos términos. Te avisaremos de cambios
          relevantes por correo o dentro de la plataforma. El uso continuado tras
          la actualización implica su aceptación.
        </p>
      </Seccion>

      <Seccion titulo="7. Contacto">
        <p>
          Para consultas sobre estos términos, escríbenos a{" "}
          <a className="text-brand-600 hover:underline" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
          .
        </p>
      </Seccion>

      <p className="text-xs">
        Este documento es una plantilla orientativa y no constituye asesoría
        legal. Recomendamos revisarlo con un abogado antes de operar
        comercialmente.
      </p>
    </LegalPage>
  );
}
