import type { Metadata } from "next";
import { LegalPage, Seccion } from "@/components/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Política de privacidad — ${SITE.name}`,
  description: `Cómo ${SITE.name} trata tus datos personales.`,
};

export default function PrivacidadPage() {
  return (
    <LegalPage titulo="Política de privacidad" actualizado="junio 2026">
      <p>
        En {SITE.name} ({SITE.domain}) respetamos tu privacidad. Esta política
        explica qué datos recopilamos y cómo los usamos, conforme a la Ley
        N° 19.628 sobre protección de la vida privada de Chile.
      </p>

      <Seccion titulo="1. Datos que recopilamos">
        <p>
          Recopilamos los datos que nos entregas al registrarte y configurar tu
          perfil: nombre, correo electrónico, empresa, RUT, rubros y regiones de
          interés. También guardamos las oportunidades que marcas y tus
          preferencias de alertas. No almacenamos datos de tarjetas de pago;
          estos son procesados por el proveedor de pagos.
        </p>
      </Seccion>

      <Seccion titulo="2. Para qué los usamos">
        <p>
          Usamos tus datos para prestar el servicio: detectar oportunidades
          relevantes según tus rubros, enviarte alertas, gestionar tu cuenta y
          tu suscripción, y mejorar la plataforma. No vendemos tus datos a
          terceros.
        </p>
      </Seccion>

      <Seccion titulo="3. Comunicaciones">
        <p>
          Si activas las alertas, te enviaremos correos o mensajes con las
          oportunidades relevantes y resúmenes. Puedes desactivarlas en cualquier
          momento desde la sección de alertas de tu cuenta.
        </p>
      </Seccion>

      <Seccion titulo="4. Conservación y seguridad">
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Aplicamos medidas
          técnicas razonables para protegerlos (cifrado de contraseñas y de la
          sesión). Ningún sistema es 100% infalible, pero trabajamos para
          resguardar tu información.
        </p>
      </Seccion>

      <Seccion titulo="5. Tus derechos">
        <p>
          Puedes acceder, rectificar o eliminar tus datos, y solicitar la baja de
          tu cuenta, escribiéndonos a{" "}
          <a className="text-brand-600 hover:underline" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
          . Atenderemos tu solicitud en los plazos que establece la ley.
        </p>
      </Seccion>

      <Seccion titulo="6. Terceros">
        <p>
          Para operar usamos proveedores de infraestructura y datos (por ejemplo,
          el alojamiento de la aplicación, la base de datos y la API de Mercado
          Público). Estos procesan datos solo para prestar el servicio.
        </p>
      </Seccion>

      <Seccion titulo="7. Contacto">
        <p>
          Dudas sobre privacidad:{" "}
          <a className="text-brand-600 hover:underline" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
          .
        </p>
      </Seccion>

      <p className="text-xs">
        Documento orientativo; no constituye asesoría legal. Revísalo con un
        profesional antes de operar comercialmente.
      </p>
    </LegalPage>
  );
}
