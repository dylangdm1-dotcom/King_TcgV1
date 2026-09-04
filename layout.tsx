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
  title: "King_TCG - Cartes & Items Pokémon",
  description: "Recherche, scanner, collection de cartes et espace indépendant pour les produits Pokémon scellés.",
  applicationName: "King_TCG",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.ico", apple: "/brands/king-tcg-logo.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "King_TCG" },
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  themeColor: "#070b10",
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
