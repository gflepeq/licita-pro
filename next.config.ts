import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker / Elest.io: BUILD_STANDALONE=1 genera un servidor autocontenido
  // (.next/standalone). En Vercel se deja sin definir (usa su propio output).
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
