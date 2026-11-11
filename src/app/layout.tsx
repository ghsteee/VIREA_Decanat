import type { Metadata, Viewport } from "next";
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "@fontsource/onest/700.css";
import "@fontsource/sofia-sans-extra-condensed/700.css";
import "@fontsource/sofia-sans-extra-condensed/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Деканыч — цифровой деканат ВТУ ВИРЭА",
  description:
    "Концепт для хакатона. ВТУ ВИРЭА — вымышленный вуз, прообраз — РТУ МИРЭА. Не официальный сервис.",
  icons: {
    icon: [{ url: "/brand/favicon-32.png", sizes: "32x32" }],
    apple: "/brand/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E8DAB8" },
    { media: "(prefers-color-scheme: dark)", color: "#062F42" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
