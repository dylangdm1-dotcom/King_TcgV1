"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  Search,
  Library,
  Settings,
  ArrowLeft,
  Crown,
} from "lucide-react";

const links = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/scanner", icon: Camera, label: "Scanner", main: true },
  { href: "/recherche", icon: Search, label: "Recherche" },
  { href: "/collection", icon: Library, label: "Collection" },
  { href: "/parametres", icon: Settings, label: "Réglages" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-cyan-400/[0.08] bg-[#06080b]/90 shadow-[0_14px_38px_rgba(0,0,0,.34)] backdrop-blur-2xl">
        <div className="relative mx-auto grid min-h-[64px] max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6">
          <div className="flex items-center justify-start">
            {pathname !== "/" && (
              <button
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#111318]/80 text-zinc-400 shadow-inner transition hover:border-cyan-400/25 hover:text-white"
                title="Retour"
                aria-label="Retour"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          <Link href="/" className="kt-brand-lockup" aria-label="Accueil King_TCG">
            <span className="kt-brand-crown-frame" aria-hidden="true">
              <Crown className="kt-brand-crown" strokeWidth={1.9} />
            </span>
            <span className="kt-brand-copy">
              <span className="kt-brand-wordmark">
                King_<span>TCG</span>
              </span>
              <span className="kt-brand-subtitle">
                Pokémon TCG • Market & Collection
              </span>
            </span>
          </Link>

          <div className="hidden items-center justify-end gap-1.5 md:flex">
            {links.map(({ href, icon: Icon, label, main }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`flex h-9 items-center gap-2 rounded-xl px-3 text-[11px] font-black transition ${
                    main
                      ? "bg-gradient-to-r from-cyan-300 to-sky-500 text-[#031015] shadow-lg shadow-cyan-400/15 hover:brightness-110"
                      : active
                        ? "border border-cyan-400/15 bg-cyan-400/[0.08] text-cyan-300"
                        : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="kt-mobile-nav" aria-label="Navigation mobile">
        {links.map(({ href, icon: Icon, label, main }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`${active ? "active" : ""} ${main ? "scan" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
