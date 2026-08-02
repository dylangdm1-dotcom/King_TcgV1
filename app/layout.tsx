// app/layout.tsx

import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PokemonProvider } from "../components/providers/PokemonProvider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "King_TCG — Scanner & Collection Pokémon",
  description:
    "King_TCG V5 — Scanner IA, gestion de collection Pokémon, prix marché réels et analyse de portefeuille.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${inter.className} antialiased bg-zinc-950 text-white`}
      >
        <PokemonProvider>
          {children}
        </PokemonProvider>
      </body>
    </html>
  );
}