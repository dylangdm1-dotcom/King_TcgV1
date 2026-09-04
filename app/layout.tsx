// Compatibilité V306 : ce fichier tolère un ancien dépôt où app/layout.tsx a
// été copié à la racine. Next.js utilise toujours app/layout.tsx ; conserver ce
// shim évite que TypeScript échoue avant le nettoyage du fichier mal placé.
import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PokemonProvider } from "@/components/providers/PokemonProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AccountProvider } from "@/components/providers/AccountProvider";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "King_TCG - Cartes & Items Pokémon",
  description: "Recherche, scanner, collection de cartes et produits Pokémon scellés.",
};

export default function CompatibilityRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-zinc-950 text-white`}>
        <ThemeProvider>
          <AccountProvider><PokemonProvider>{children}</PokemonProvider></AccountProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
