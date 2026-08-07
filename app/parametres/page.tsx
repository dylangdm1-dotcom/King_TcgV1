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
  Crown,
  ExternalLink,
  Sparkles,
  User,
  Users,
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
    <div className="kt-premium-panel overflow-hidden rounded-[20px]">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`flex w-full items-center justify-between gap-4 p-4 text-left transition sm:p-5 ${
          isOpen ? "bg-white/[0.025]" : "hover:bg-white/[0.018]"
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-white">
              {title}
            </span>
            <span className="mt-1 block text-[10px] leading-4 text-zinc-500">
              {description}
            </span>
          </span>
        </div>

        <span
          className={`shrink-0 text-[10px] font-black text-zinc-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      <div
        className={`grid transition-all duration-200 ease-out ${
          isOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/[0.06] px-4 pb-5 pt-4 text-[11px] font-medium leading-5 text-zinc-400 sm:px-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  status,
  tone = "cyan",
}: {
  label: string;
  status: string;
  tone?: "cyan" | "green" | "amber";
}) {
  const toneClass = {
    cyan: "border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300",
    green: "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300",
    amber: "border-amber-400/15 bg-amber-400/[0.06] text-amber-300",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
      <span className="text-[10px] font-black text-zinc-300">{label}</span>
      <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${toneClass}`}>
        {status}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="kt-premium-button-secondary inline-flex items-center gap-2 px-3.5 py-2 text-[9px] uppercase tracking-wider"
            >
              Retour à l’accueil
            </Link>
          </div>

          <section className="kt-premium-panel relative overflow-hidden rounded-[24px] p-5 sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-400/[0.06] blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-300 shadow-[0_0_32px_rgba(34,211,238,0.08)]">
                <Crown className="h-7 w-7" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-300">
                  <Settings className="h-3 w-3" />
                  Informations de l’application
                </span>
                <h1 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
                  King_TCG
                </h1>
                <p className="mt-1 text-xs font-bold text-zinc-400">
                  Pokémon Trading Card Companion
                </p>
                <p className="mt-3 max-w-2xl text-[11px] leading-5 text-zinc-500">
                  Retrouvez ici l’état réel des modules, les sources de données et les informations utiles pour comprendre le fonctionnement de l’application.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusPill label="Recherche & prix" status="Actif" tone="green" />
            <StatusPill label="Scanner Mono / Batch" status="Actif" tone="green" />
            <StatusPill label="Collection PSA" status="Actif" tone="green" />
            <StatusPill label="Estimation PSA IA" status="À venir" tone="amber" />
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/parametres/compte"
              className="kt-premium-panel group flex items-center gap-4 rounded-[20px] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/20 sm:p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                <User className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-white">
                  Gestion du compte
                </span>
                <span className="mt-1 block text-[10px] leading-4 text-zinc-500">
                  Accédez à votre session, vos préférences et aux futures fonctions Premium.
                </span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-cyan-300" />
            </Link>

            <Link
              href="/parametres/testeurs"
              className="kt-premium-panel group flex items-center gap-4 rounded-[20px] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/20 sm:p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] text-cyan-300">
                <Users className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-white">
                  Testeurs professionnels
                </span>
                <span className="mt-1 block text-[10px] leading-4 text-zinc-500">
                  Découvrez les partenaires qui participent aux tests et à l’amélioration de King_TCG.
                </span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-cyan-300" />
            </Link>
          </section>

          <div className="space-y-3">
            <AccordionItem
              title="À propos de King_TCG"
              description="Positionnement, fonctions principales et identité de l’application."
              icon={<Info className="h-4 w-4" />}
              defaultOpen
            >
              <div className="space-y-3">
                <p>
                  <strong className="text-white">King_TCG</strong> accompagne les collectionneurs Pokémon TCG dans la recherche de cartes, la comparaison des prix, le suivi de collection et l’analyse de marché.
                </p>
                <p>
                  L’interface privilégie une lecture rapide sur mobile : cartes identifiées, sources de prix séparées, historique local et outils de portefeuille accessibles depuis un même espace.
                </p>
                <p className="rounded-2xl border border-white/[0.07] bg-black/20 p-3 text-[10px] text-zinc-500">
                  King_TCG est un outil indépendant et n’est pas une application officielle de The Pokémon Company, Nintendo, Creatures ou GAME FREAK.
                </p>
              </div>
            </AccordionItem>

            <AccordionItem
              title="Sources de prix"
              description="Origine des cotations et méthode d’affichage des valeurs."
              icon={<BarChart3 className="h-4 w-4" />}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                  <p className="font-black text-white">Cardmarket</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Référence principalement utilisée pour le marché européen.</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                  <p className="font-black text-white">TCGPlayer</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Référence complémentaire pour le marché nord-américain.</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                  <p className="font-black text-white">eBay / ventes</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Utilisé lorsqu’une donnée de vente ou une moyenne exploitable est disponible.</p>
                </div>
                <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                  <p className="font-black text-white">Moyenne King_TCG</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Calculée uniquement à partir des sources réellement trouvées, sans inventer une valeur absente.</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-zinc-500">
                Les prix sont des repères de marché. L’état, la langue, la variante et la disponibilité réelle peuvent modifier le prix final d’une carte.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Scanner de cartes"
              description="Modes disponibles, langues et limites actuelles."
              icon={<ScanLine className="h-4 w-4" />}
            >
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-cyan-400/12 bg-cyan-400/[0.045] p-3">
                    <p className="font-black text-cyan-200">Mono</p>
                    <p className="mt-1 text-[10px] text-zinc-500">Analyse une seule carte pour fournir une identification détaillée.</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                    <p className="font-black text-white">Batch</p>
                    <p className="mt-1 text-[10px] text-zinc-500">Analyse jusqu’à quatre cartes dans une même capture.</p>
                  </div>
                </div>
                <p>
                  Les cartes françaises et anglaises sont les mieux prises en charge. Les cartes japonaises et chinoises peuvent être détectées, mais leur correspondance avec la base reste en cours d’amélioration.
                </p>
              </div>
            </AccordionItem>

            <AccordionItem
              title="PSA et grading"
              description="Recherche de prix, collection gradée et future estimation IA."
              icon={<Award className="h-4 w-4" />}
            >
              <div className="space-y-3">
                <p>
                  La page PSA permet de rechercher des repères PriceCharting, d’ajouter une carte gradée à la collection et de suivre sa valeur estimée ainsi que son certificat.
                </p>
                <p>
                  Le module d’estimation du grading par photos est préparé mais n’est pas encore activé. Lorsqu’il sera disponible, son résultat restera une <strong className="text-white">estimation non officielle</strong>, distincte d’une note attribuée par PSA.
                </p>
              </div>
            </AccordionItem>

            <AccordionItem
              title="Stockage et confidentialité"
              description="Où sont conservées vos cartes et préférences."
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              <div className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3">
                <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
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
              description="Résumé clair des modules réellement accessibles aujourd’hui."
              icon={<Sparkles className="h-4 w-4" />}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Recherche manuelle et par extension",
                  "Prix Cardmarket, TCGPlayer et données complémentaires",
                  "Fiches cartes et graphiques de marché",
                  "Collection, favoris et tableau de bord",
                  "Scanner Mono et Batch",
                  "Recherche et collection PSA",
                  "Alertes et opportunités",
                  "Export / import selon les modules disponibles",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                    <span className="text-[10px] text-zinc-400">{item}</span>
                  </div>
                ))}
              </div>
            </AccordionItem>

            <AccordionItem
              title="Questions fréquentes"
              description="Réponses courtes sur les prix, les données et les résultats."
              icon={<HelpCircle className="h-4 w-4" />}
            >
              <div className="space-y-4">
                <div>
                  <p className="font-black text-white">Pourquoi une synchronisation peut-elle prendre du temps ?</p>
                  <p className="mt-1">Les résultats de cartes peuvent apparaître avant que toutes les sources de prix aient répondu. L’interface indique alors la synchronisation en cours.</p>
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
                King_TCG s’appuie sur plusieurs services et bases TCG, notamment Pokémon TCG API, TCGdex et PriceCharting selon les modules. Leur disponibilité et leur couverture peuvent évoluer indépendamment de l’application.
              </p>
              <Link
                href="/parametres/testeurs"
                className="kt-premium-button-secondary mt-4 inline-flex items-center gap-2 px-3.5 py-2 text-[9px] uppercase tracking-wider"
              >
                Découvrir les testeurs partenaires
                <ExternalLink className="h-3 w-3" />
              </Link>
            </AccordionItem>
          </div>

          <footer className="border-t border-white/[0.06] pt-6 text-center">
            <p className="text-[10px] font-black tracking-[0.18em] text-white">
              King_TCG
            </p>
            <p className="mt-1 text-[9px] font-bold text-zinc-500">
              Pokémon Trading Card Companion
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
