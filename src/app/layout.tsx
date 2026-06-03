import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { accentVars } from "@/lib/accents";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Licitapro — Detecta y gana licitaciones del Estado con IA",
  description:
    "Licitapro detecta automáticamente licitaciones públicas y Compras Ágiles de Mercado Público con inteligencia artificial. Alertas diarias, análisis de bases con IA y seguimiento de adjudicaciones para PYMEs proveedoras del Estado en Chile.",
  keywords: [
    "licitaciones",
    "Mercado Público",
    "ChileCompra",
    "Compras Ágiles",
    "licitaciones públicas",
    "proveedores del Estado",
  ],
};

// Script que evita el parpadeo de tema: corre antes del primer paint.
const noFlash = `
(function(){try{
  var t = document.cookie.match(/(?:^|; )theme=([^;]+)/);
  t = t ? t[1] : (localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if(t==='dark') document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const store = await cookies();
  const theme = store.get("theme")?.value === "dark" ? "dark" : "";
  const accent = store.get("accent")?.value || "blue";

  return (
    <html
      lang="es"
      className={`${inter.variable} h-full ${theme}`}
      style={parseStyle(accentVars(accent)) as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}

// Convierte "--brand-600:#xxx;--brand-700:#yyy;" a objeto de estilo React.
function parseStyle(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  s.split(";")
    .filter(Boolean)
    .forEach((decl) => {
      const [k, v] = decl.split(":");
      if (k && v) out[k.trim()] = v.trim();
    });
  return out;
}
