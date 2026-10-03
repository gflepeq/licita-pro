import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida "standalone" solo para Docker (Elestio/VPS): el Dockerfile define
  // BUILD_STANDALONE=1. En Vercel NO debe usarse (arma su propio output serverless).
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
