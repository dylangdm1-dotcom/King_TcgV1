import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PokemonProvider } from "../components/providers/PokemonProvider";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";

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
    <html lang="fr" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('king_tcg_theme')==='light'?'light':'dark';document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-zinc-950 text-white`}>
        <ThemeProvider>
          <PokemonProvider>
            {children}
          </PokemonProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
