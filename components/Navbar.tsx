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
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

const links = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/scanner", icon: Camera, label: "Scanner", main: true },
  { href: "/recherche", icon: Search, label: "Recherche" },
  { href: "/collection", icon: Library, label: "Collection" },
  { href: "/parametres", icon: Settings, label: "Paramètres" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-cyan-400/[0.08] bg-[#090d13]/94 shadow-[0_14px_38px_rgba(0,0,0,.34)] backdrop-blur-2xl">
        <div className="kt-navbar-inner relative mx-auto min-h-[64px] max-w-[1180px] px-3 sm:px-5">
          <div className="kt-navbar-back-slot flex items-center justify-start">
            {pathname !== "/" && (
              <button
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/[0.07] text-sky-300 shadow-inner transition hover:border-sky-300/40 hover:bg-sky-400/[0.11] hover:text-white"
                title="Retour"
                aria-label="Retour"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          <Link href="/" className="kt-brand-lockup kt-brand-lockup-image" aria-label="Accueil King_TCG">
            <img
              src="/brands/king-tcg-logo.png"
              alt="King_TCG — Pokémon TCG Market & Collection"
              className="kt-brand-logo-image"
            />
          </Link>

          <div className="kt-navbar-actions flex items-center justify-end gap-2">
            <Link
              href="/psa"
              title="Accès rapide PSA"
              aria-label="Accès rapide PSA"
              className={`kt-psa-navbar-link flex h-10 w-[52px] items-center justify-center overflow-hidden rounded-xl border p-0 text-[10px] font-bold uppercase tracking-wide transition ${
                pathname === "/psa" || pathname.startsWith("/psa/")
                  ? "border-violet-300/35 bg-violet-300/[0.12] text-violet-100 shadow-[0_10px_26px_rgba(167,139,250,.14)]"
                  : "border-transparent bg-[#151b23] text-zinc-300 hover:bg-violet-300/[0.06] hover:text-white"
              }`}
            >
              <img src="/brands/psa.png" alt="PSA" className="kt-psa-navbar-logo h-full w-full object-contain" />
            </Link>
            <NotificationBell />
            <div className="hidden items-center gap-1.5 md:flex">
            {links.map(({ href, icon: Icon, label, main }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`flex h-9 items-center gap-2 rounded-xl px-3 text-[11px] font-bold transition ${
                    main
                      ? "border border-cyan-300/35 bg-cyan-300 text-[#061016] shadow-[0_8px_24px_rgba(34,211,238,.16)] hover:bg-cyan-200"
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
