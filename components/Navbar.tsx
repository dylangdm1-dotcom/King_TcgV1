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
import NotificationBell from "@/components/notifications/NotificationBell";

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
      <nav className="sticky top-0 z-50 border-b border-cyan-400/[0.08] bg-[#090d13]/94 shadow-[0_14px_38px_rgba(0,0,0,.34)] backdrop-blur-2xl">
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
                Pokémon Trading Card Companion
              </span>
            </span>
          </Link>

          <div className="flex items-center justify-end gap-2">
            <NotificationBell />
            <div className="hidden items-center gap-1.5 md:flex">
            {links.map(({ href, icon: Icon, label, main }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`flex h-9 items-center gap-2 rounded-xl px-3 text-[11px] font-black transition ${
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