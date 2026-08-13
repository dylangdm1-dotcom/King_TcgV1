"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Settings,
  Database,
  Info,
  ShieldCheck,
  HelpCircle,
  ScanLine,
  Award,
  BarChart3,
  CloudOff,
  ExternalLink,
  Sparkles,
  User,
  Users,
  ChevronRight,
  Palette,
} from "lucide-react";

import Navbar from "../../components/Navbar";

interface AccordionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="kt-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`flex w-full items-center justify-between gap-4 p-4 text-left transition ${
          isOpen ? "bg-cyan-400/[0.025]" : "hover:bg-white/[0.02]"
        }`}
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-black text-white">{title}</span>
            <span className="mt-1 block text-[10px] leading-4 text-zinc-300">{description}</span>
          </span>
        </span>

        <ChevronRight
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
            isOpen ? "rotate-90 text-cyan-300" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/[0.06] px-4 pb-5 pt-4 text-[11px] font-medium leading-5 text-zinc-200">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <div className="kt-subpanel flex min-w-0 items-center justify-between gap-2 px-3 py-2.5">
      <span className="truncate text-[10px] font-bold text-zinc-300">{label}</span>
      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1 text-[10px] font-black uppercase tracking-[0.09em] text-emerald-300">
        Actif
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="kt-page-wrap space-y-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.10em] text-cyan-200 transition hover:border-cyan-300/45 hover:text-white"
          >
            ← Retour à l’accueil
          </Link>

          <header className="kt-page-header kt-hero-surface relative overflow-hidden border">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/[0.055] blur-3xl" />
            <div className="relative flex items-center gap-4">
              <span className="kt-page-icon flex shrink-0 items-center justify-center text-cyan-300">
                <Settings className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="kt-page-title">
                  Paramètres
                </h1>
                <p className="kt-page-subtitle mt-1">
                  Gérez votre compte, vos préférences et les informations de King_TCG.
                </p>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatusPill label="Recherche & prix" />
            <StatusPill label="Scanner" />
            <StatusPill label="Collection PSA" />
            <StatusPill label="Estimation PSA" />
          </section>

          <section className="kt-panel kt-data-list overflow-hidden">
            <Link
              href="/parametres/compte"
              className="group flex items-center gap-4 border-b border-white/[0.06] p-4 transition hover:bg-cyan-400/[0.025] sm:p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border border-cyan-400/28 bg-cyan-400/[0.07] text-cyan-300">
                <User className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-black text-cyan-300">Compte & offres</span>
                  <span className="rounded-full border border-blue-400/35 bg-blue-400/[0.08] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-blue-300">Normal</span>
                  <span className="rounded-full border border-[#f5c451]/40 bg-[#f5c451]/[0.08] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#f5c451]">Premium</span>
                </span>
                <span className="mt-1 block text-[10px] leading-4 text-zinc-300">
                  Accédez à votre compte, à la connexion Google et aux formules King_TCG.
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-cyan-300" />
            </Link>

            <Link
              href="/parametres/testeurs"
              className="group flex items-center gap-4 border-b border-white/[0.06] p-4 transition hover:bg-cyan-400/[0.025] sm:p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border border-cyan-400/28 bg-cyan-400/[0.07] text-cyan-300">
                <Users className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-[13px] font-black text-cyan-300">Partenaires & testeurs</span>
                <span className="mt-1 block text-[10px] leading-4 text-zinc-300">
                  Retrouvez les partenaires qui participent aux tests et à l’amélioration de King_TCG.
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-cyan-300" />
            </Link>

            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border border-cyan-400/28 bg-cyan-400/[0.07] text-cyan-300">
                  <Palette className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[13px] font-black text-cyan-300">Thème de l’application</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-300">
                    Le thème sombre actuel reste actif. Le thème clair sera préparé plus tard.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 rounded-[12px] border border-white/[0.06] bg-black/20 p-1">
                <span className="rounded-[9px] border border-cyan-400/30 bg-cyan-400/[0.09] px-3 py-2 text-[10px] font-black text-cyan-300">
                  Sombre · actif
                </span>
                <span className="rounded-[9px] px-3 py-2 text-[10px] font-black text-zinc-500">
                  Clair · bientôt
                </span>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3 pt-1">
            <Database className="h-4 w-4 text-cyan-300" />
            <h2 className="whitespace-nowrap text-[11px] font-black uppercase tracking-[0.09em] text-cyan-300">
              Informations & fonctionnement
            </h2>
            <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/35 to-transparent" />
          </div>

          <div className="space-y-2.5">
            <AccordionItem
              title="À propos de King_TCG"
              description="Positionnement, fonctions principales et identité de l’application."
              icon={<Info className="h-4 w-4" />}
            >
              <div className="space-y-3">
                <p>
                  <strong className="text-white">King_TCG</strong> accompagne les collectionneurs Pokémon TCG dans la recherche de cartes, la comparaison des prix, le suivi de collection et l’analyse de marché.
                </p>
                <p>
                  L’interface privilégie une lecture rapide sur mobile : cartes identifiées, sources de prix séparées, historique local et outils de portefeuille accessibles depuis un même espace.
                </p>
                  <p className="kt-subpanel p-3 text-[10px] text-zinc-300">
                  King_TCG est un outil indépendant et n’est pas une application officielle de The Pokémon Company, Nintendo, Creatures ou GAME FREAK.
                </p>
              </div>
            </AccordionItem>

            <AccordionItem
              title="Sources de prix"
              description="Origine des cotations et méthode d’affichage des valeurs."
              icon={<BarChart3 className="h-4 w-4" />}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Cardmarket", "Référence principalement utilisée pour le marché européen."],
                  ["TCGPlayer", "Référence complémentaire pour le marché nord-américain."],
                  ["eBay / ventes", "Utilisé lorsqu’une donnée de vente ou une moyenne exploitable est disponible."],
                  ["Moyenne King_TCG", "Calculée uniquement à partir des sources réellement trouvées, sans inventer une valeur absente."],
                ].map(([title, description]) => (
                  <div key={title} className="kt-subpanel p-3">
                    <p className="font-black text-white">{title}</p>
                    <p className="mt-1 text-[10px] text-zinc-300">{description}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-zinc-300">
                Les prix sont des repères de marché. L’état, la langue, la variante et la disponibilité réelle peuvent modifier le prix final d’une carte.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Scanner de cartes"
              description="Modes disponibles, langues, sessions et fonctionnement."
              icon={<ScanLine className="h-4 w-4" />}
              defaultOpen
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-300/24 bg-blue-400/[0.06] p-3">
                  <p className="font-black text-cyan-300">Mono</p>
                  <p className="mt-1 text-[10px] text-zinc-300">Analyse une seule carte pour fournir une identification détaillée.</p>
                </div>
                <div className="rounded-xl border border-[#f5c451]/26 bg-[#f5c451]/[0.06] p-3">
                  <p className="font-black text-[#f5c451]">Batch</p>
                  <p className="mt-1 text-[10px] text-zinc-300">Conserve plusieurs résultats dans une même session.</p>
                </div>
                <div className="rounded-xl border border-[#f5c451]/26 bg-[#f5c451]/[0.06] p-3">
                  <p className="font-black text-[#f5c451]">Quad Scan</p>
                  <p className="mt-1 text-[10px] text-zinc-300">Analyse quatre zones d’une même capture.</p>
                </div>
              </div>
            </AccordionItem>

            <AccordionItem
              title="PSA et grading"
              description="Collection gradée et estimation PSA par image."
              icon={<Award className="h-4 w-4" />}
            >
              <div className="space-y-2">
                <p>
                  La page PSA permet de rechercher des repères PriceCharting, d’ajouter une carte gradée à la collection et de suivre sa valeur estimée ainsi que son certificat.
                </p>
                <p>
                  L’estimation PSA par photos reste une <strong className="text-white">estimation non officielle</strong>, distincte d’une note réellement attribuée par PSA.
                </p>
              </div>
            </AccordionItem>

            <AccordionItem
              title="Stockage et confidentialité"
              description="Où sont conservées vos cartes et préférences."
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              <div className="kt-subpanel flex items-start gap-3 p-3">
                <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <p>
                  La collection, les favoris et les préférences sont actuellement enregistrés localement dans le navigateur. Une suppression des données du navigateur peut donc effacer ces informations.
                </p>
              </div>
              <p className="mt-3">
                Aucun service Cloud n’est présenté comme actif dans cette version. Une future synchronisation devra être clairement activée par l’utilisateur.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Fonctionnalités disponibles"
              description="Résumé des modules réellement accessibles aujourd’hui."
              icon={<Sparkles className="h-4 w-4" />}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Recherche manuelle et par extension",
                  "Prix multi-sources et cote King_TCG",
                  "Fiches cartes et graphiques de marché",
                  "Collection, favoris et tableau de bord",
                  "Scanner Mono, Batch et Quad",
                  "Catalogues JP / CN dédiés",
                  "Collection PSA et estimation PSA",
                  "Alertes, opportunités et analyses de marché",
                  "Export / import",
                  "Comptes Cloud / Premium — en cours de préparation",
                ].map((item) => (
                  <div key={item} className="kt-subpanel flex items-start gap-2 px-3 py-2.5">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                    <span className="text-[10px] text-zinc-200">{item}</span>
                  </div>
                ))}
              </div>
            </AccordionItem>

            <AccordionItem
              title="Questions fréquentes"
              description="Prix, données, synchronisation et analyses."
              icon={<HelpCircle className="h-4 w-4" />}
            >
              <div className="space-y-4">
                <div>
                  <p className="font-black text-white">Pourquoi une synchronisation peut-elle prendre du temps ?</p>
                  <p className="mt-1">Les résultats de cartes peuvent apparaître avant que toutes les sources de prix aient répondu.</p>
                </div>
                <div>
                  <p className="font-black text-white">Pourquoi une carte peut-elle rester non indexée ?</p>
                  <p className="mt-1">Une langue, une variante ou une édition peut ne pas être correctement référencée par les sources externes. King_TCG préfère afficher l’absence de donnée plutôt qu’un faux prix.</p>
                </div>
                <div>
                  <p className="font-black text-white">Les analyses sont-elles des conseils financiers ?</p>
                  <p className="mt-1">Non. Les données et projections sont des outils d’aide à la lecture du marché, pas une garantie de performance ou de revente.</p>
                </div>
              </div>
            </AccordionItem>

            <AccordionItem
              title="Crédits et écosystème"
              description="Services de données et ressources techniques utilisées."
              icon={<Database className="h-4 w-4" />}
            >
              <p>
                King_TCG sépare les données de catalogue et les données marché. TCGdex et Pokémon TCG API servent les catalogues compatibles ; PokéWallet complète les chemins régionaux JP/CN ; Cardmarket, TCGPlayer, JustTCG et eBay alimentent les cotations lorsqu’une correspondance fiable existe. PriceCharting reste utilisé pour les modules PSA. Une source absente ne doit jamais entraîner l’invention d’un prix.
              </p>
              <Link
                href="/parametres/testeurs"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.055] px-3.5 py-2 text-[10px] font-black text-cyan-300"
              >
                Découvrir les partenaires
                <ExternalLink className="h-3 w-3" />
              </Link>
            </AccordionItem>
          </div>

          <footer className="border-t border-white/[0.06] pt-5 text-center">
            <p className="text-[10px] font-black tracking-[0.18em] text-white">King_TCG</p>
            <p className="mt-1 text-[10px] font-bold text-zinc-300">Pokémon Trading Card Companion</p>
          </footer>
        </div>
      </main>
    </>
  );
}
