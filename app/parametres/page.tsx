"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Settings,
  User,
  Database,
  Users,
  Info,
  ShieldCheck,
  HelpCircle,
  Mail,
  Rocket,
} from "lucide-react";

import Navbar from "../../components/Navbar";

interface AccordionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function AccordionItem({ title, icon, children }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-900 bg-neutral-900/40 overflow-hidden transition-all shadow-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 sm:p-5 text-left transition-all ${
          isOpen ? "bg-neutral-800/40" : "hover:bg-neutral-800/20"
        }`}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-cyan-400">{icon}</span>}
          <h3 className="text-xs font-black text-white uppercase tracking-tight">
            {title}
          </h3>
        </div>
        <span
          className={`text-[9px] font-black text-zinc-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-5 pt-1 text-xs text-zinc-300 leading-relaxed space-y-3 font-medium">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors font-black text-[9px] uppercase tracking-wider bg-neutral-900/60 border border-zinc-800 px-3.5 py-2 rounded-xl shadow-lg"
            >
              Retour au Dashboard
            </Link>
          </div>

          {/* HEADER V5.0 */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
              <Settings className="w-3 h-3" />
              Configuration système V5.0
            </span>
            <h1 className="mt-2 text-lg font-black uppercase tracking-tight text-white">
              Paramètres de King_TCG V5.0
            </h1>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Gérez votre environnement King_TCG, vos préférences, vos données et les modules avancés.
            </p>
          </section>

          <div className="space-y-3">
            <AccordionItem
              title="À propos de King_TCG"
              icon={<Info className="w-4 h-4" />}
            >
              <p>
                King_TCG est une solution SaaS premium pensée pour les collectionneurs exigeants et les passionnés de cartes TCG.
              </p>
              <p>
                La plateforme regroupe désormais un ensemble complet d'outils : scanner IA, reconnaissance intelligente, gestion de collection, suivi de valeur marché, analyse portefeuille et statistiques avancées.
              </p>
              <p>
                La version V5.0 introduit une architecture améliorée, un moteur de valorisation renforcé et une expérience utilisateur optimisée pour suivre vos actifs TCG.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Gestion du Compte & Premium"
              icon={<User className="w-4 h-4" />}
            >
              <p>
                Votre compte sécurise vos préférences et permet l'accès aux fonctionnalités avancées de King_TCG.
              </p>
              <p>
                Les futures fonctionnalités Premium permettront : synchronisation Cloud, sauvegarde automatique, analyses IA avancées et outils professionnels.
              </p>
              <p className="text-zinc-400 font-bold uppercase text-[10px] bg-black/40 border border-zinc-800 p-2 rounded-xl">
                Statut du compte : Session locale active (Invité)
              </p>
              <div className="pt-1">
                <Link
                  href="/parametres/compte"
                  className="inline-block bg-neutral-900 border border-zinc-800 hover:border-cyan-500/50 text-white font-black py-2.5 px-3.5 rounded-xl text-[9px] uppercase tracking-wider transition-all shadow-md"
                >
                  Ouvrir le panneau de compte
                </Link>
              </div>
            </AccordionItem>

            <AccordionItem
              title="Remerciements & Sources"
              icon={<Database className="w-4 h-4" />}
            >
              <p>
                La précision des données King_TCG repose sur différentes sources TCG reconnues ainsi que sur les contributions de la communauté.
              </p>
              <p>
                Merci aux équipes Pokémon TCG API, TCGdex et aux contributeurs open source participant à l'évolution de l'écosystème.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Nos testeurs professionnels"
              icon={<Users className="w-4 h-4" />}
            >
              <p>
                Découvrez les membres de la communauté participant aux tests et à l'amélioration continue de King_TCG.
              </p>
              <div className="pt-2">
                <Link
                  href="/parametres/testeurs"
                  className="inline-block bg-neutral-900 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 font-black py-2.5 px-3.5 rounded-xl text-[9px] uppercase tracking-wider transition-all shadow-md"
                >
                  Voir les testeurs partenaires
                </Link>
              </div>
            </AccordionItem>

            <AccordionItem
              title="Spécifications de la Version"
              icon={<Rocket className="w-4 h-4" />}
            >
              <p className="font-bold text-white">
                Version actuelle : King_TCG v5.0.0
              </p>
              <p className="text-zinc-400">
                Modules disponibles :
              </p>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400 font-mono text-[11px]">
                <li>Recherche intelligente</li>
                <li>Scanner OCR / IA Vision V5</li>
                <li>Matching intelligent Pokémon</li>
                <li>Gestion collection complète</li>
                <li>Favoris et Watchlist</li>
                <li>Historique des prix</li>
                <li>Graphiques marché</li>
                <li>Analyse tendances</li>
                <li>Indicateurs IA</li>
                <li>Tableau de bord portefeuille</li>
                <li>Moteur de valorisation V5</li>
                <li>Gestion des états cartes</li>
              </ul>
              <p className="text-zinc-400 pt-3 font-bold">
                Prochaines évolutions :
              </p>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400 font-mono text-[11px]">
                <li>Synchronisation Cloud</li>
                <li>Alertes marché intelligentes</li>
                <li>Export CSV</li>
                <li>Scanner IA Vision V6</li>
                <li>Analyse prédictive IA</li>
                <li>Comptes Premium</li>
              </ul>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wider pt-3">
                Dernière mise à jour : Juillet 2026
              </p>
            </AccordionItem>

            <AccordionItem
              title="Foire aux Questions (FAQ)"
              icon={<HelpCircle className="w-4 h-4" />}
            >
              <p className="font-bold text-white">
                Comment sont calculés les prix ?
              </p>
              <p>
                Les estimations affichées sont calculées à partir de données de marché TCG, d'offres disponibles et d'historiques de ventes afin de fournir une valeur moyenne cohérente.
              </p>
              <p className="font-bold text-white pt-2">
                Les prix sont-ils exacts ?
              </p>
              <p>
                Les valeurs indiquées restent des estimations. Le prix réel dépend toujours de l'état précis de la carte, du grading, de la langue, de la rareté et du marché actuel.
              </p>
              <p className="font-bold text-white pt-2">
                Comment fonctionne le scanner IA ?
              </p>
              <p>
                Le scanner utilise la reconnaissance d'image, l'OCR et les systèmes d'identification intelligents afin de retrouver automatiquement les cartes depuis une photo ou une image importée.
              </p>
              <p className="font-bold text-white pt-2">
                Les données sont-elles sauvegardées ?
              </p>
              <p>
                Actuellement, vos données sont conservées localement dans votre navigateur. La synchronisation Cloud sécurisée sera disponible avec les futures versions Premium.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Conditions d'Utilisation du Service"
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              <p>
                En utilisant King_TCG, vous acceptez que les informations, analyses et estimations fournies soient uniquement destinées à aider au suivi de votre collection.
              </p>
              <p>
                King_TCG ne peut être tenu responsable des variations du marché, des erreurs de données externes ou des décisions d'achat et de vente réalisées à partir des informations affichées.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Politique de Confidentialité des Données"
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              <p>
                La confidentialité de vos données reste une priorité. Actuellement, vos collections, favoris et préférences sont stockés localement sur votre appareil.
              </p>
              <p>
                Aucune donnée personnelle n'est vendue ou partagée. Lors du déploiement des services Cloud, la synchronisation nécessitera votre consentement explicite.
              </p>
            </AccordionItem>

            <AccordionItem
              title="Raccordement Support / Contact"
              icon={<Mail className="w-4 h-4" />}
            >
              <p>
                Une question, une suggestion ou un problème technique ? L'équipe King_TCG reste disponible afin d'améliorer continuellement votre expérience.
              </p>
              <div className="pt-1">
                <a
                  href="mailto:support@kingtcg.com"
                  className="font-mono font-bold text-cyan-400 border-b border-cyan-400/40 hover:border-cyan-400 transition-colors text-xs"
                >
                  support@kingtcg.com
                </a>
              </div>
              <p className="text-zinc-500 text-[11px] italic pt-1">
                Délai moyen de réponse : sous 24 à 48 heures (jours ouvrés).
              </p>
            </AccordionItem>
          </div>

          {/* FOOTER V5.0 */}
          <footer className="mt-16 text-center border-t border-zinc-900 pt-6">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">
              King_TCG • Collection Manager • Version 5.0
            </p>
            <p className="mt-2 text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
              Scanner IA • Portfolio • Market Engine • Collection V5
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
