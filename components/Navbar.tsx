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
      <nav className="sticky top-0 z-50 border-b border-cyan-400/[0.08] bg-[#07090c]/88 shadow-[0_12px_35px_rgba(0,0,0,.28)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
            {pathname !== "/" && (
              <button
                onClick={() => router.back()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#111318]/80 text-zinc-400 shadow-inner transition hover:border-cyan-400/25 hover:text-white"
                title="Retour"
                aria-label="Retour"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <Link
              href="/"
              className="group flex min-w-0 items-center gap-2.5 select-none"
              aria-label="Accueil King_TCG"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-gradient-to-br from-cyan-300/14 to-sky-500/5 text-lg shadow-[0_0_24px_rgba(34,211,238,.08)]">
                👑
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Accueil
                  </span>
                  <p className="truncate text-sm font-black tracking-tight text-white sm:text-base">
                    King<span className="text-cyan-400">_TCG</span>
                  </p>
                </div>
                <p className="hidden text-[8px] font-bold uppercase tracking-[0.24em] text-zinc-500 sm:block">
                  Application TCG • Marché & Collection
                </p>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-1.5 md:flex">
            {links.map(({ href, icon: Icon, label, main }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
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
          const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
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
