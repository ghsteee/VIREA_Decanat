import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка для Docker-образа (задача 3.2): server.js и минимальные node_modules
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit"],
  experimental: { serverActions: { bodySizeLimit: "30mb" } },
  outputFileTracingIncludes: {
    "/": ["./docs/knowledge/polozhenie-demo.md"],
    "/assistant": ["./docs/knowledge/polozhenie-demo.md"],
    "/assistant/rules": ["./docs/knowledge/polozhenie-demo.md"],
    "/study/portfolio/export": [
      "./public/fonts/*.ttf",
      "./node_modules/pdfkit/js/data/**/*",
    ],
  },
  // Телеметрия Next.js отключается переменной NEXT_TELEMETRY_DISABLED=1 в Dockerfile
};

export default nextConfig;
