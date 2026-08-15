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
  CircleDollarSign,
  BadgeCheck,
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";

const links = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/scanner", icon: Camera, label: "Scanner", main: true },
  { href: "/recherche", icon: Search, label: "Recherche" },
  { href: "/collection", icon: Library, label: "Collection" },
  { href: "/psa", icon: BadgeCheck, label: "PSA", premium: true },
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
              href="/ventes"
              title="Ventes Premium"
              aria-label="Ventes Premium"
              className="flex h-11 w-11 flex-col items-center justify-center gap-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-white transition hover:text-amber-100"
            >
              <CircleDollarSign className="h-4 w-4 text-amber-300" />
              <span>Ventes</span>
            </Link>
            <NotificationBell />
            <div className="hidden items-center gap-1.5 md:flex">
            {links.map(({ href, icon: Icon, label, main, premium }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`flex h-9 items-center gap-2 rounded-xl px-3 text-[11px] font-bold transition ${
                    main
                      ? "border border-cyan-300/35 bg-cyan-300 text-[#061016] shadow-[0_8px_24px_rgba(34,211,238,.16)] hover:bg-cyan-200"
                      : premium
                        ? active
                          ? "border border-amber-300/35 bg-amber-300/[0.12] text-amber-200 shadow-[0_8px_24px_rgba(245,196,81,.10)]"
                          : "border border-amber-300/15 bg-amber-300/[0.035] text-amber-300 hover:border-amber-300/30 hover:bg-amber-300/[0.07] hover:text-amber-100"
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
        {links.map(({ href, icon: Icon, label, main, premium }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`${active ? "active" : ""} ${main ? "scan" : ""} ${premium ? "premium" : ""}`}
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
