"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Camera, Search, Library, Settings, ArrowLeft } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
    { href: "/scanner", icon: <Camera className="w-4 h-4 text-black" />, label: "Scanner", main: true },
    { href: "/recherche", icon: <Search className="w-4 h-4" />, label: "Recherche" },
    { href: "/collection", icon: <Library className="w-4 h-4" />, label: "Bibliothèque" },
    { href: "/parametres", icon: <Settings className="w-4 h-4" />, label: "Paramètres" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-900 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        
        {/* Section Gauche : Bouton Retour + Logo */}
        <div className="flex items-center gap-4">
          {pathname !== "/" && (
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
              title="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <Link href="/" className="group flex items-center gap-3 select-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/30 text-xl shadow-md transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-500/30">
              👑
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-white leading-tight">
                King<span className="text-cyan-400">_TCG</span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500 leading-none mt-0.5">
                Pokémon Market
              </p>
            </div>
          </Link>
        </div>

        {/* Section Droite : Liens de Navigation */}
        <div className="flex items-center gap-2.5">
          {links.map((link) => {
            const isActive = pathname === link.href;

            // Bouton Principal "Scanner" (Bouton Cyan)
            if (link.main) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className="flex h-10 px-4 items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-black shadow-lg shadow-cyan-500/10 transition-all duration-300 hover:scale-[1.03] cursor-pointer"
                >
                  {link.icon}
                  <span className="hidden sm:inline">Scanner</span>
                </Link>
              );
            }

            // Boutons de navigation secondaires (Icône Cyan si actif, sinon gris/blanc au survol)
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "border-cyan-500/30 bg-zinc-900 text-cyan-400 shadow-sm shadow-cyan-500/5 scale-[1.02]"
                    : "border-zinc-900 bg-zinc-900/20 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/50 hover:text-white"
                }`}
              >
                {/* L'icône passe en Cyan brillant si l'onglet est actif */}
                <div className={`transition-colors duration-300 ${isActive ? "text-cyan-400" : "text-zinc-400 group-hover:text-white"}`}>
                  {link.icon}
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}