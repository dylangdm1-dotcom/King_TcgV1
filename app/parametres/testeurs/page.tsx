"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  FlaskConical,
  Info,
  Instagram,
  MessageCircle,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
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
    links: [
      {
        label: "Whatnot · @lesfratetcg",
        href: "https://www.whatnot.com/fr-FR/user/lesfratetcg",
        icon: Video,
      },
      {
        label: "TikTok · @lesfratetcg",
        href: "https://tiktok.com/@lesfratetcg",
        icon: MessageCircle,
      },
    ],
    active: true,
  },
  {
    name: "Noeunoeuf_tcg",
    logo: "/partners/noeunoeuf_tcg.jpg",
    role: "Testeur partenaire · Belgique",
    platform: "Whatnot & Instagram",
    description:
      "Testeur basé en Belgique, il contribue aux retours terrain sur le scanner, la recherche de cartes, les prix et l’expérience mobile de King_TCG.",
    links: [
      {
        label: "Whatnot · noeunoeuf_tcg",
        href: "https://www.whatnot.com/s/EoqCPB03",
        icon: Video,
      },
      {
        label: "Instagram · @noeunoeuf_tcg",
        href: "https://www.instagram.com/noeunoeuf_tcg",
        icon: Instagram,
      },
    ],
    active: true,
  },
  {
    name: "Prochain partenaire",
    logo: undefined,
    role: "Profil en préparation",
    platform: "Communauté TCG",
    description:
      "Les futurs testeurs seront présentés uniquement après leur accord et la validation de leur contribution au projet.",
    links: [],
    active: false,
  },
];

const testerModules = [
  {
    label: "Visiteurs",
    value: "44",
    detail: "Visiteurs",
    icon: Users,
    tone: "cyan",
  },
  {
    label: "Pages vues",
    value: "4 085",
    detail: "Pages consultées",
    icon: MessagesSquare,
    tone: "violet",
  },
  {
    label: "Taux de rebond",
    value: "55 %",
    detail: "+55 %",
    icon: ShieldCheck,
    tone: "emerald",
  },
] as const;

const testerTones = {
  cyan: {
    icon: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-300",
    title: "text-cyan-300",
  },
  violet: {
    icon: "border-violet-400/25 bg-violet-400/[0.08] text-violet-300",
    title: "text-violet-200",
  },
  emerald: {
    icon: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
    title: "text-emerald-300",
  },
};

export default function TesteursPage() {
  const activePartners = partners.filter((partner) => partner.active);
  const upcomingPartners = partners.filter((partner) => !partner.active);

  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
          <Link
            href="/parametres"
            className="kt-premium-button-secondary inline-flex items-center gap-2 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux paramètres
          </Link>

          <header className="flex items-center gap-4 border-b border-cyan-400/10 pb-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-cyan-300/20 bg-[#0b1219] text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,.08)]">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-[28px]">
                Partenaires & Testeurs
              </h1>
              <p className="mt-1 text-[13px] font-medium leading-5 text-zinc-100">
                Découvrez les partenaires et testeurs qui accompagnent l’évolution de King_TCG.
              </p>
            </div>
          </header>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <Star className="h-4 w-4 text-cyan-300" />
              <h2 className="whitespace-nowrap text-[13px] font-black uppercase tracking-[0.08em] text-cyan-300">
                Nos partenaires
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/45 to-transparent" />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {activePartners.map((partner, index) => (
                <article
                  key={`${partner.name}-${index}`}
                  className={`relative overflow-hidden rounded-[18px] border bg-[#0d141c] p-6 shadow-[0_18px_48px_rgba(0,0,0,.30)] transition duration-200 hover:-translate-y-1 ${
                    index === 1
                      ? "border-emerald-400/35 hover:border-emerald-300/55"
                      : "border-cyan-400/18 hover:border-cyan-300/35"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
                      index === 1 ? "bg-emerald-400/[0.07]" : "bg-cyan-400/[0.06]"
                    }`}
                  />

                  <div className="relative flex flex-col items-center text-center">
                    {partner.logo && (
                      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-black/35 p-1 shadow-[0_14px_34px_rgba(0,0,0,.35)] sm:h-36 sm:w-36">
                        <img
                          src={partner.logo}
                          alt={`Logo ${partner.name}`}
                          className="h-full w-full rounded-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <h3 className="mt-5 text-xl font-black tracking-tight text-white">
                      {partner.name}
                    </h3>

                    <span
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                        index === 1
                          ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300"
                          : "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300"
                      }`}
                    >
                      <BadgeCheck className="h-3 w-3" />
                      Partenaire officiel
                    </span>

                    <p className="mt-3 text-[12px] font-bold text-zinc-100">
                      {partner.role} · {partner.platform}
                    </p>
                    <p className="mt-3 max-w-md text-[12px] leading-5 text-zinc-200">
                      {partner.description}
                    </p>

                    <div className="mt-5 flex w-full flex-wrap justify-center gap-2 border-t border-white/[0.07] pt-4">
                      {partner.links.map(({ label, href, icon: Icon }) => (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-zinc-100 transition hover:border-cyan-300/30 hover:text-cyan-200"
                        >
                          <Icon className="h-3.5 w-3.5 text-cyan-300" />
                          <span>{label}</span>
                          <ExternalLink className="h-3 w-3 text-zinc-400 transition group-hover:text-cyan-300" />
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {upcomingPartners.length > 0 && (
              <div className="mt-3 rounded-[14px] border border-dashed border-white/[0.09] bg-white/[0.025] px-4 py-3 text-center text-[11px] font-medium text-zinc-300">
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-cyan-300" />
                D’autres partenaires pourront rejoindre le programme après validation.
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <Users className="h-4 w-4 text-cyan-300" />
              <h2 className="whitespace-nowrap text-[13px] font-black uppercase tracking-[0.08em] text-cyan-300">
                Indicateurs réels
              </h2>
              <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/45 to-transparent" />
            </div>

            <div className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-white/[0.1] bg-[#0d141c] shadow-[0_18px_48px_rgba(0,0,0,.24)]">
              {testerModules.map((item, index) => {
                const Icon = item.icon;
                const tone = testerTones[item.tone];
                return (
                  <div
                    key={item.label}
                    className={`flex min-w-0 flex-col items-center justify-center px-2 py-5 text-center sm:px-4 sm:py-6 ${
                      index > 0 ? "border-l border-white/[0.09]" : ""
                    }`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full border sm:h-11 sm:w-11 ${tone.icon}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <p className={`mt-2 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.035em] sm:text-[10px] ${tone.title}`}>
                      {item.label}
                    </p>
                    <p className="mt-1.5 text-xl font-black leading-none text-white sm:text-2xl">
                      {item.value}
                    </p>
                    <p className={`mt-1 text-[9px] font-bold sm:text-[10px] ${
                      item.label === "Taux de rebond" ? "text-emerald-300" : "text-zinc-300"
                    }`}>
                      {item.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[18px] border border-cyan-400/35 bg-[#0d141c] p-5 shadow-[0_0_28px_rgba(34,211,238,.04)] sm:p-6">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <div>
                <h2 className="text-[12px] font-black uppercase tracking-[0.08em] text-cyan-300">
                  Notre démarche
                </h2>
                <p className="mt-2 text-[12px] leading-5 text-zinc-100">
                  Les retours terrain servent à améliorer le scanner, les données marché et l’expérience d’utilisation de King_TCG. Cette contribution reste indépendante de The Pokémon Company.
                </p>
              </div>
            </div>
          </section>

          <footer className="border-t border-white/[0.06] pt-6 text-center">
            <p className="text-[11px] font-black tracking-[0.18em] text-white">King_TCG</p>
            <p className="mt-1 text-[11px] font-bold text-zinc-300">Pokémon Trading Card Companion</p>
          </footer>
        </div>
      </main>
    </>
  );
}
