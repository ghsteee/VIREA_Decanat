import type { MetadataRoute } from "next";

// PWA: установка на экран «Домой» — на iPhone push работает только так (N3).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Деканыч — цифровой деканат",
    short_name: "Деканыч",
    description: "Учебный прототип личного кабинета студента.",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F5F0",
    theme_color: "#E8DAB8",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
