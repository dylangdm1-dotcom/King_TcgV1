import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "King_TCG — Cartes & Items Pokémon",
    short_name: "King_TCG",
    description: "Scanner, recherche, collection et produits Pokémon scellés.",
    start_url: "/",
    display: "standalone",
    background_color: "#070b10",
    theme_color: "#070b10",
    lang: "fr",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/brands/king-tcg-logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
