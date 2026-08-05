"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  MessageCircle,
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
    role: "Testeur partenaire",
    platform: "Whatnot & TikTok",
    description:
      "Participe aux essais terrain du scanner, aux retours sur l’expérience collectionneur et à la vérification des parcours mobiles.",
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
    name: "Prochain partenaire",
    role: "Profil en préparation",
    platform: "Communauté TCG",
    description:
      "Un nouvel espace partenaire pourra être ajouté après validation du profil et des tests réalisés sur King_TCG.",
    links: [],
    active: false,
  },
  {
    name: "Prochain partenaire",
    role: "Profil en préparation",
    platform: "Communauté TCG",
    description:
      "Les futurs testeurs seront présentés uniquement après leur accord et la validation de leur contribution au projet.",
    links: [],
    active: false,
  },
];

export default function TesteursPage() {
  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
          <Link
            href="/parametres"
            className="kt-premium-button-secondary inline-flex items-center gap-2 px-3.5 py-2 text-[9px] uppercase tracking-wider"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux paramètres
          </Link>

          <section className="kt-premium-panel relative overflow-hidden rounded-[26px] p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.07] blur-3xl" />
            <div className="relative flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-300 shadow-[0_0_34px_rgba(34,211,238,0.09)]">
                <Users className="h-7 w-7" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
                  <Star className="h-3 w-3" />
                  Programme partenaires
                </span>
                <h1 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
                  Testeurs professionnels
                </h1>
                <p className="mt-1 text-xs font-bold text-zinc-400">
                  Des retours terrain pour améliorer King_TCG
                </p>
                <p className="mt-3 max-w-2xl text-[11px] leading-5 text-zinc-500">
                  Ces profils contribuent à tester les parcours réels, la compréhension des prix, le scanner et l’expérience mobile avant les prochaines versions.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Tests terrain", value: "Scanner & mobile" },
              { label: "Retours suivis", value: "UX & données" },
              { label: "Statut", value: "Programme actif" },
            ].map((item) => (
              <div key={item.label} className="kt-premium-panel rounded-[20px] p-4">
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                <p className="mt-3 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-600">
                  {item.label}
                </p>
                <p className="mt-1 text-[11px] font-black text-white">{item.value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {partners.map((partner, index) => (
              <article
                key={`${partner.name}-${index}`}
                className={`kt-premium-panel relative overflow-hidden rounded-[24px] p-5 transition duration-200 ${
                  partner.active
                    ? "hover:-translate-y-1 hover:border-cyan-300/20"
                    : "opacity-70"
                }`}
              >
                {partner.active && (
                  <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-cyan-400/[0.07] blur-3xl" />
                )}

                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] ${
                      partner.active
                        ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300"
                        : "border-white/[0.07] bg-white/[0.025] text-zinc-500"
                    }`}>
                      {partner.active ? "Partenaire validé" : "À venir"}
                    </span>
                    {partner.active ? (
                      <Sparkles className="h-4 w-4 text-cyan-300" />
                    ) : (
                      <Users className="h-4 w-4 text-zinc-700" />
                    )}
                  </div>

                  <h2 className="mt-5 text-base font-black text-white">{partner.name}</h2>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-300">
                    {partner.role}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-zinc-600">{partner.platform}</p>

                  <p className="mt-4 min-h-[64px] text-[10px] leading-5 text-zinc-500">
                    {partner.description}
                  </p>

                  {partner.links.length > 0 ? (
                    <div className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
                      {partner.links.map(({ label, href, icon: Icon }) => (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-2.5 text-[9px] font-black text-zinc-300 transition hover:border-cyan-300/20 hover:text-cyan-200"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                            <span className="truncate">{label}</span>
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:text-cyan-300" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-white/[0.08] bg-black/15 px-3 py-3 text-center text-[9px] font-bold text-zinc-700">
                      Profil partenaire disponible prochainement
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>

          <section className="kt-premium-panel rounded-[22px] p-5 text-center sm:p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-300">
              Contribution encadrée
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-[10px] leading-5 text-zinc-500">
              Être présenté comme testeur ne signifie pas un partenariat officiel avec The Pokémon Company. Les retours concernent uniquement l’amélioration indépendante de King_TCG.
            </p>
          </section>

          <footer className="border-t border-white/[0.06] pt-6 text-center">
            <p className="text-[10px] font-black tracking-[0.18em] text-white">King_TCG</p>
            <p className="mt-1 text-[9px] font-bold text-zinc-600">Pokémon Trading Card Companion</p>
          </footer>
        </div>
      </main>
    </>
  );
}
