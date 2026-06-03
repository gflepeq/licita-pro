import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida para deploy en Docker/servidores persistentes.
  output: "standalone",
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
