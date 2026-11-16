import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TWOK STUDIO",
    short_name: "TWOK",
    description: "Photographie, vidéo et drone à Marrakech.",
    start_url: "/fr",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#141311",
    icons: [
      { src: "/brand-icon.png", sizes: "512x512", type: "image/png" },
      { src: "/brand-icon.png", sizes: "192x192", type: "image/png" },
    ],
  };
}
