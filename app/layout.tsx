import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PokemonProvider } from "../components/providers/PokemonProvider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "King_TCG - Scanner & Collection Pokémon",
  description: "Analyse, collection et investissement Pokémon. Scannez et suivez vos cartes en temps réel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} antialiased bg-zinc-950 text-white`}>
        <PokemonProvider>
          {children}
        </PokemonProvider>
      </body>
    </html>
  );
}