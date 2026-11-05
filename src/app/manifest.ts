import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi Comunidad",
    short_name: "Mi Comunidad",
    description: "Anuncios, incidencias, documentos, juntas y cuotas de tu comunidad de vecinos.",
    lang: "es-ES",
    start_url: "/c",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f0",
    theme_color: "#c2623f",
    categories: ["lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
