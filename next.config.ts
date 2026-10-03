import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida "standalone" para la imagen Docker que despliega Elestio.
  output: "standalone",
  serverExternalPackages: ["postgres"],
  // Detrás del proxy de Elestio el Host no coincide con el dominio público;
  // sin esto Next rechaza las Server Actions (login, registro, etc.).
  experimental: {
    serverActions: {
      allowedOrigins: ["liciapp.cl", "www.liciapp.cl", "*.vm.elestio.app"],
    },
  },
};

export default nextConfig;
