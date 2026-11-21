import type { Metadata, Viewport } from "next";
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "@fontsource/onest/700.css";
import "@fontsource/sofia-sans-extra-condensed/700.css";
import "@fontsource/sofia-sans-extra-condensed/800.css";
import "./globals.css";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Деканыч — цифровой деканат ВТУ ВИРЭА",
  description:
    "Деканыч — учебный прототип личного кабинета студента ВТУ ВИРЭА.",
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Тема из настроек пользователя: «как система» — без атрибута
  const user = await getCurrentUser();
  const prefs = user
    ? await db.userPreferences.findUnique({
        where: { userId: user.id },
        select: { theme: true },
      })
    : null;
  const theme =
    prefs?.theme && prefs.theme !== "system" ? prefs.theme : undefined;

  return (
    <html lang="ru" data-theme={theme}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
