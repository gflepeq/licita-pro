import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida "standalone" solo para Docker (Elestio/VPS): el Dockerfile define
  // BUILD_STANDALONE=1. En Vercel NO debe usarse (arma su propio output serverless).
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
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
