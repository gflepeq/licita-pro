import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nota: para deploy en Docker/servidor persistente, agregar output: "standalone".
  // En Vercel NO debe usarse (Vercel arma su propio output serverless).
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
