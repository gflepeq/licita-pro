import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "./logo";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Detecta y gana licitaciones del Estado con inteligencia
              artificial. Hecho en Chile para PYMEs proveedoras.
            </p>
            <a
              href={`mailto:${SITE.email}`}
              className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
            >
              <Mail size={15} /> {SITE.email}
            </a>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Producto</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li><a href="/#soluciones" className="hover:text-white">Detección con IA</a></li>
              <li><a href="/#soluciones" className="hover:text-white">Análisis de bases</a></li>
              <li><a href="/#precios" className="hover:text-white">Precios</a></li>
              <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Empresa</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li><a href="/#problema" className="hover:text-white">Sobre {SITE.name}</a></li>
              <li><a href="/#faq" className="hover:text-white">Preguntas frecuentes</a></li>
              <li>
                <a href={`mailto:${SITE.email}`} className="hover:text-white">
                  Contacto
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Legal</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              <li><Link href="/terminos" className="hover:text-white">Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-white">Política de privacidad</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name} — {SITE.domain}. Todos los derechos reservados.</p>
          <p>Datos provenientes de Mercado Público (ChileCompra).</p>
        </div>
      </div>
    </footer>
  );
}
