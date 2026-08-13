"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Info,
  Instagram,
  MessageCircle,
  ShieldCheck,
  Users,
  Video,
  Eye,
} from "lucide-react";
import Navbar from "../../../components/Navbar";

const partners = [
  {
    name: "LesFratesTCG",
    logo: "/partners/lesfratetcg.webp",
    role: "Testeur partenaire · Corse",
    platform: "Whatnot & TikTok",
    description:
      "Testeurs basés en Corse, ils contribuent aux essais terrain du scanner, à l’expérience collectionneur et à l’amélioration des parcours mobiles.",
    accent: "cyan" as const,
    links: [
      { label: "Whatnot · @lesfratetcg", href: "https://www.whatnot.com/fr-FR/user/lesfratetcg", icon: Video },
      { label: "TikTok · @lesfratetcg", href: "https://tiktok.com/@lesfratetcg", icon: MessageCircle },
    ],
  },
  {
    name: "Noeunoeuf_tcg",
    logo: "/partners/noeunoeuf_tcg.jpg",
    role: "Testeur partenaire · Belgique",
    platform: "Whatnot & Instagram",
    description:
      "Testeur basé en Belgique, il contribue aux retours terrain sur le scanner, la recherche de cartes, les prix et l’expérience mobile de King_TCG.",
    accent: "green" as const,
    links: [
      { label: "Whatnot · noeunoeuf_tcg", href: "https://www.whatnot.com/s/EoqCPB03", icon: Video },
      { label: "Instagram · @noeunoeuf_tcg", href: "https://www.instagram.com/noeunoeuf_tcg", icon: Instagram },
    ],
  },
];

const metrics = [
  { label: "Testeurs", value: "44", detail: "Testeurs", icon: Users },
  { label: "Pages vues", value: "4 085", detail: "Pages consultées", icon: Eye },
  { label: "Taux de rebond", value: "55 %", detail: "+55 %", icon: ShieldCheck },
];

export default function TesteursPage() {
  return (
    <>
      <Navbar />
      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-7">
          <Link
            href="/parametres"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-[#0b1219] px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:border-cyan-300/40 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-cyan-300" />
            Retour aux paramètres
          </Link>

          <header className="relative mt-4 overflow-hidden rounded-[18px] border border-white/[0.12] bg-[#0a1118] px-5 py-4 shadow-[0_16px_40px_rgba(0,0,0,.22)] sm:px-7 sm:py-5">
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-24 -translate-x-1/2 bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.9)]" />
            <div className="relative">
              <div className="flex items-center gap-2 text-cyan-300">
                <Users className="h-5 w-5 shrink-0" />
                <h1 className="text-lg font-black tracking-tight sm:text-xl">Partenaires & Testeurs</h1>
              </div>
              <p className="mt-1.5 text-[12px] leading-5 text-zinc-300 sm:text-[13px]">
                Découvrez les partenaires et testeurs qui accompagnent l’évolution de King_TCG.
              </p>
            </div>
          </header>

          <section className="mt-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-black tracking-tight text-cyan-300 sm:text-lg"><BadgeCheck className="h-4 w-4" />Nos partenaires</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {partners.map((partner) => {
                const green = partner.accent === "green";
                return (
                  <article
                    key={partner.name}
                    className={`rounded-[15px] border-2 bg-[#0a1118] p-4 shadow-[0_16px_38px_rgba(0,0,0,.20)] sm:p-5 ${
                      green
                        ? "shadow-[0_0_24px_rgba(52,211,153,.10)]"
                        : "shadow-[0_0_24px_rgba(34,211,238,.10)]"
                    }`}
                    style={{
                      borderColor: green
                        ? "rgba(52, 211, 153, 0.88)"
                        : "rgba(34, 211, 238, 0.88)",
                    }}
                  > 
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className={`mx-auto flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-black p-1 sm:mx-0 ${green ? "border-emerald-400/70 shadow-[0_0_22px_rgba(52,211,153,.12)]" : "border-cyan-400/70 shadow-[0_0_22px_rgba(34,211,238,.12)]"}`}>
                        <img src={partner.logo} alt={`Logo ${partner.name}`} className="h-full w-full rounded-full object-cover" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black tracking-tight text-white">{partner.name}</h3>
                          <span className={`rounded-md border px-2 py-1 text-[9px] font-bold ${green ? "border-emerald-400/35 bg-emerald-400/[0.08] text-emerald-300" : "border-cyan-400/35 bg-cyan-400/[0.08] text-cyan-300"}`}>
                            Partenaire officiel
                          </span>
                        </div>
                        <p className={`mt-2 text-[11px] font-semibold ${green ? "text-emerald-300" : "text-cyan-300"}`}>
                          {partner.role} <span className="px-1 text-cyan-300">•</span> <span className="text-zinc-200">{partner.platform}</span>
                        </p>
                        <p className="mt-2 text-[11px] leading-[1.55] text-zinc-300">{partner.description}</p>

                        <div className="mt-3 space-y-2">
                          {partner.links.map(({ label, href, icon: Icon }) => (
                            <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={`flex w-fit max-w-full items-center gap-2 rounded-lg border bg-[#0b141d] px-3 py-2 text-[10px] font-semibold transition ${green ? "border-emerald-400/15 text-emerald-200 hover:border-emerald-300/35" : "border-cyan-400/15 text-cyan-200 hover:border-cyan-300/35"}`}>
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{label}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-[14px] border border-dashed border-cyan-400/55 bg-cyan-400/[0.025] px-4 py-3 text-[11px] text-zinc-300">
              <Info className="h-4 w-4 shrink-0 text-cyan-300" />
              D’autres partenaires pourront rejoindre le programme après validation.
            </div>
          </section>

          <section className="mt-4">
            <h2 className="mb-2 text-center text-lg font-black tracking-tight text-cyan-300">Indicateurs réels des tests effectués</h2>
            <div className="grid grid-cols-3 gap-3">
              {metrics.map(({ label, value, detail, icon: Icon }) => (
                <div key={label} className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-[14px] border border-white/[0.12] bg-[#0a1118] px-3 py-4 text-center sm:px-4">
                  <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/[0.05] text-cyan-300 sm:flex">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 text-center">
                    <p className="truncate text-[10px] font-semibold text-zinc-200 sm:text-[11px]">{label}</p>
                    <p className="mt-1 text-xl font-black leading-none text-cyan-300 sm:text-2xl">{value}</p>
                    <p className="mt-1 truncate text-[9px] text-zinc-400 sm:text-[10px]">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-3 rounded-[14px] border border-white/[0.12] bg-[#0a1118] px-4 py-4 sm:px-5">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/35 bg-violet-400/[0.06] text-violet-200">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[12px] font-black text-white">Notre démarche</h2>
                <p className="mt-1 text-[11px] leading-5 text-zinc-300">
                  Les retours terrain servent à améliorer le scanner, les données marché et l’expérience d’utilisation de King_TCG.<br className="hidden sm:block" /> Cette contribution reste indépendante de The Pokémon Company.
                </p>
              </div>
            </div>
          </section>

          <footer className="mt-5 border-t border-white/[0.08] pt-4 text-center">
            <p className="text-[13px] font-black text-white">King_TCG</p>
            <p className="mt-1 text-[10px] text-zinc-400">Pokémon Trading Card Companion</p>
          </footer>
        </div>
      </main>
    </>
  );
}
