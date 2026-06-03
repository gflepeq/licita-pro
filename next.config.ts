import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida para deploy en Docker/servidores persistentes.
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
