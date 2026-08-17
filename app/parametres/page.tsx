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
  Moon,
  Sun,
  RefreshCw,
  Trash2,
} from "lucide-react";

import Navbar from "../../components/Navbar";
import { useTheme } from "../../components/providers/ThemeProvider";
import { clearAllData } from "../../lib/storage";

const ACCOUNT_DATA_KEYS = [
  "king_tcg_psa_collection_v1",
  "king_tcg_price_history",
  "king_tcg_signal_snapshot_v1",
] as const;

const CACHE_KEYS: ReadonlySet<string> = new Set([
  "king_tcg_market_price_cache_v1",
  "king_tcg_market_price_cache_v2_variant_condition",
  "king_tcg_signal_snapshot_v1",
]);

const CACHE_PREFIXES = [
  "king_tcg_cards_cache",
  "king_tcg_pokemon_cache",
  "king_tcg_set_details_",
] as const;

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
  const { theme, setTheme } = useTheme();
  const [storageMessage, setStorageMessage] = useState("");

  const removeCacheKeys = () => {
    const keysToRemove: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (
        key &&
        (CACHE_KEYS.has(key) || CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  };

  const handleClearCache = () => {
    const confirmed = window.confirm(
      "Vider le cache King_TCG ? Votre stock, vos favoris, votre thème et votre quota seront conservés.",
    );
    if (!confirmed) return;

    removeCacheKeys();
    setStorageMessage("Cache King_TCG vidé. Actualisation en cours…");
    window.setTimeout(() => window.location.reload(), 700);
  };

  const handleResetAccountData = () => {
    const confirmed = window.confirm(
      "Réinitialiser complètement le stock local ? Cette action supprimera la collection, les favoris, les cartes PSA et l’historique. Elle est irréversible.",
    );
    if (!confirmed) return;

    clearAllData();
    ACCOUNT_DATA_KEYS.forEach((key) => window.localStorage.removeItem(key));
    setStorageMessage("Données du stock supprimées. Actualisation en cours…");
    window.setTimeout(() => window.location.reload(), 900);
  };

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
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[13px] font-black text-cyan-300">Compte & offres</span>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span className="rounded-full border border-cyan-300/40 bg-cyan-400/[0.08] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-cyan-300">Normal</span>
                    <span className="text-[10px] font-black text-zinc-500">/</span>
                    <span className="rounded-full border border-[#f5c451]/40 bg-[#f5c451]/[0.08] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#f5c451]">Premium</span>
                  </span>
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
                <span className="text-[13px] font-black text-cyan-300">Partenaires & collaborateurs</span>
                <span className="mt-1 block text-[10px] leading-4 text-zinc-300">
                  Retrouvez les partenaires et collaborateurs qui participent aux tests et à l’amélioration de King_TCG.
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
                    Le mode sombre reste utilisé par défaut. Votre choix est appliqué immédiatement et mémorisé.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1 rounded-[12px] border border-white/[0.06] bg-black/20 p-1" role="group" aria-label="Thème de l’application">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  aria-pressed={theme === "dark"}
                  className={`flex items-center gap-1.5 rounded-[9px] border px-3 py-2 text-[10px] font-black transition ${theme === "dark" ? "border-cyan-400/[0.42] bg-cyan-400/[0.11] text-cyan-300" : "border-transparent text-zinc-400 hover:text-cyan-300"}`}
                >
                  <Moon className="h-3.5 w-3.5" /> Sombre
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  aria-pressed={theme === "light"}
                  className={`flex items-center gap-1.5 rounded-[9px] border px-3 py-2 text-[10px] font-black transition ${theme === "light" ? "border-cyan-400/[0.42] bg-cyan-400/[0.11] text-cyan-300" : "border-transparent text-zinc-400 hover:text-cyan-300"}`}
                >
                  <Sun className="h-3.5 w-3.5" /> Clair
                </button>
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
                  ["Cardmarket", "Référence principale pour les cotations européennes lorsqu'une correspondance compatible est disponible."],
                  ["TCGPlayer", "Source complémentaire de cotations, principalement pour le marché nord-américain."],
                  ["eBay", "Annonces actives utilisées comme repère complémentaire. Elles ne sont pas présentées comme des ventes conclues."],
                  ["Cote King_TCG", "Calcul réalisé uniquement à partir des sources compatibles réellement disponibles."],
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
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-cyan-300/35 bg-cyan-400/[0.06] p-3">
                  <p className="font-black text-cyan-300">Mono · Normal</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-300">Choisissez Mono puis cadrez une carte entière. Les repères Nom Pokémon et N° de carte facilitent la prise de vue avant l’identification.</p>
                </div>
                <div className="rounded-xl border border-[#f5c451]/38 bg-sky-400/[0.06] p-3">
                  <p className="font-black text-sky-300">Batch · Premium</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-300">Scannez jusqu’à quatre cartes une par une. Les résultats restent conservés dans la session pendant la consultation des fiches.</p>
                </div>
                <div className="rounded-xl border border-[#f5c451]/38 bg-violet-400/[0.06] p-3">
                  <p className="font-black text-violet-300">Quad · Premium</p>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-300">Placez jusqu’à quatre cartes dans une seule photo. Chaque cadre est analysé séparément et les résultats restent disponibles dans la session.</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-4 text-zinc-300">
                À l’ouverture du scanner, aucun mode n’est lancé automatiquement : Mono, Batch ou Quad doit d’abord être sélectionné. Une session correspond à une utilisation du scanner selon les règles du compte.
              </p>
            </AccordionItem>

            <AccordionItem
              title="PSA et grading"
              description="Collection gradée et estimation PSA par image."
              icon={<Award className="h-4 w-4" />}
            >
              <div className="space-y-2">
                <p>
                  La recherche de prix PSA propose les parcours <strong className="text-white">EN</strong>, <strong className="text-white">FR</strong> et <strong className="text-white">JP</strong>. PriceCharting est utilisé en priorité pour les prix PSA disponibles ; eBay complète les résultats avec des annonces actives compatibles dans la langue sélectionnée.
                </p>
                <p>
                  Une carte PSA trouvée peut être ajoutée à la collection avec son grade et son prix d’achat. L’estimation PSA par photos reste une <strong className="text-white">estimation non officielle</strong>, distincte d’une note réellement attribuée par PSA.
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

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="flex items-center gap-3 rounded-[14px] border border-cyan-300/[0.34] bg-cyan-400/[0.065] px-4 py-3 text-left transition hover:border-cyan-200/[0.58] hover:bg-cyan-400/[0.11]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/[0.10] text-cyan-300">
                    <RefreshCw className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[11px] font-black text-cyan-200">Vider le cache</span>
                    <span className="mt-0.5 block text-[9px] leading-4 text-zinc-300">
                      Conserve le stock, les favoris, le thème et le quota.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleResetAccountData}
                  className="flex items-center gap-3 rounded-[14px] border border-rose-300/[0.38] bg-rose-400/[0.065] px-4 py-3 text-left transition hover:border-rose-200/[0.62] hover:bg-rose-400/[0.11]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-400/[0.10] text-rose-300">
                    <Trash2 className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[11px] font-black text-rose-200">Réinitialiser le stock</span>
                    <span className="mt-0.5 block text-[9px] leading-4 text-zinc-300">
                      Supprime collection, favoris, PSA et historique.
                    </span>
                  </span>
                </button>
              </div>

              {storageMessage ? (
                <p className="mt-3 rounded-xl border border-cyan-300/[0.28] bg-cyan-400/[0.06] px-3 py-2 text-center text-[10px] font-bold text-cyan-200">
                  {storageMessage}
                </p>
              ) : null}

              <p className="mt-3 text-[9px] leading-4 text-zinc-400">
                La réinitialisation ne modifie ni le thème choisi ni le quota de scanner. Une confirmation est toujours demandée avant suppression.
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
                  "Scanner Mono + Batch / Quad Premium (50 sessions)",
                  "Catalogues FR / EN / JP / CN",
                  "Collection PSA, recherche EN / FR / JP et estimation IA",
                  "Alertes, opportunités et analyses de marché",
                  "Export / import",
                  "Ventes Premium — module préparé, activation à venir",
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
                King_TCG sépare les données de catalogue et les données marché. TCGdex et Pokémon TCG API servent les catalogues compatibles ; PokéWallet complète les chemins régionaux JP/CN ; Cardmarket, TCGPlayer, JustTCG et eBay alimentent les cotations lorsqu’une correspondance fiable existe. PriceCharting alimente principalement la recherche PSA EN ; eBay complète désormais la recherche PSA FR. Une source absente ne doit jamais entraîner l’invention d’un prix.
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
