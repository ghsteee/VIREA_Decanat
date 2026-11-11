import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка для Docker-образа (задача 3.2): server.js и минимальные node_modules
  output: "standalone",
  poweredByHeader: false,
  // Телеметрия Next.js отключается переменной NEXT_TELEMETRY_DISABLED=1 в Dockerfile
};

export default nextConfig;
