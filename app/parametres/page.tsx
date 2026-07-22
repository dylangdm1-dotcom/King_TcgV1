"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";

interface AccordionProps {
  title: string;
  children: React.ReactNode;
}

function AccordionItem({ title, children }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 text-left transition-all ${
          isOpen ? "bg-neutral-900/30" : "hover:bg-neutral-900/10"
        }`}
      >
        <h3 className="text-xs font-black text-white uppercase tracking-tight">{title}</h3>
        <span className={`text-[9px] font-black text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      <div className={`grid transition-all duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 leading-relaxed space-y-3 font-medium">
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

      <main className="min-h-screen bg-black text-white pb-20 selection:bg-cyan-500/10">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
          
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors font-black text-[9px] uppercase tracking-wider bg-neutral-950/40 border border-zinc-900 px-3 py-2 rounded-xl"
            >
              Retour au Dashboard
            </Link>
          </div>

          {/* En-tête Technique */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 sm:p-5">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Configuration système</span>
            <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white">Paramètres de King_TCG</h1>
          </section>

          {/* Liste des Accordéons Style King_TCG */}
          <div className="space-y-2">
            
            <AccordionItem title="À propos de King_TCG">
              <p>King_TCG est une solution SaaS premium pensée pour les collectionneurs exigeants et les passionnés de cartes TCG.</p>
              <p>La plateforme regroupe l'ensemble des outils nécessaires pour gérer sereinement votre collection : numérisation de cartes par scanner, suivi précis de la valeur de marché, analyse des évolutions de prix et statistiques détaillées sur votre portefeuille.</p>
              <p>Conçue pour offrir une expérience fluide et moderne, King_TCG vous aide à piloter la performance de votre collection et à découvrir les nouvelles tendances du marché en toute simplicité.</p>
            </AccordionItem>

            <AccordionItem title="Gestion du Compte & Premium">
              <p>Votre compte sécurise vos préférences et vous permet d'accéder à l'ensemble des outils de suivi de portefeuille.</p>
              <p>Prochainement, les fonctionnalités d'accès Premium débloqueront la synchronisation Cloud multi-appareils, la sauvegarde automatique de vos données et des options d'analyse avancées.</p>
              <p className="text-zinc-600 font-bold uppercase text-[10px]">Statut du compte : Session locale active (Invité)</p>
              <div className="pt-1">
                <Link 
                  href="/parametres/compte" 
                  className="inline-block bg-neutral-950 border border-zinc-900 hover:border-zinc-800 text-white font-black py-2 px-3 rounded text-[9px] uppercase tracking-wider transition-all"
                >
                  Ouvrir le panneau de compte
                </Link>
              </div>
            </AccordionItem>

            <AccordionItem title="Remerciements & Sources">
              <p>La précision des données de King_TCG repose sur la fiabilité d'API publiques reconnues ainsi que sur le soutien continu de la communauté TCG.</p>
              <p>Un remerciement tout particulier aux équipes de Pokémon TCG API et TCGdex pour la mise à disposition de leurs bases de données, ainsi qu'à tous les contributeurs open source qui font vivre cet écosystème.</p>
            </AccordionItem>

            <AccordionItem title="Spécifications de la Version">
              <p className="font-bold text-zinc-200">Version actuelle : King_TCG v1.0.0</p>
              <p className="text-zinc-500">Modules disponibles :</p>
              <ul className="list-disc pl-4 space-y-0.5 text-zinc-500 font-mono text-[11px]">
                <li>Recherche intelligente</li>
                <li>Scanner OCR</li>
                <li>Gestion de collection</li>
                <li>Favoris</li>
                <li>Historique des prix</li>
                <li>Graphiques</li>
                <li>Analyse des tendances</li>
                <li>Indicateurs IA</li>
                <li>Tableau de bord</li>
                <li>Portefeuille</li>
                <li>Suivi des performances</li>
                <li>Mode responsive</li>
              </ul>
              <p className="text-zinc-500 pt-2 font-bold">Prochaines évolutions :</p>
              <ul className="list-disc pl-4 space-y-0.5 text-zinc-500 font-mono text-[11px]">
                <li>Cloud Sync</li>
                <li>Alertes de prix</li>
                <li>Export CSV</li>
                <li>Scanner IA amélioré</li>
                <li>Comptes Premium</li>
              </ul>
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-wider pt-2">Dernière mise à jour : Juillet 2026</p>
            </AccordionItem>

            <AccordionItem title="Foire aux Questions (FAQ)">
              <p className="font-bold text-zinc-200">Comment sont calculés les prix ?</p>
              <p>Les estimations affichées sont calculées à partir de données de ventes et d'offres consolidées sur le marché secondaire, puis nettoyées pour refléter la valeur moyenne réelle des cartes.</p>
              <p className="font-bold text-zinc-200 pt-1">Les prix sont-ils exacts ?</p>
              <p>Les prix indiqués sont des estimations indicatives basées sur l'état général du marché. La valeur effective d'une carte dépend toujours de son état de conservation exact (Grading) et des conditions de vente.</p>
              <p className="font-bold text-zinc-200 pt-1">Comment fonctionne le scanner ?</p>
              <p>Le scanner s'appuie sur la reconnaissance optique de caractères (OCR) et la détection d'image pour identifier rapidement les cartes à partir de votre appareil photo ou d'un fichier.</p>
              <p className="font-bold text-zinc-200 pt-1">Les données sont-elles sauvegardées ?</p>
              <p>Pour le moment, toutes vos cartes et configurations sont conservées localement dans votre navigateur. La synchronisation sécurisée sur le Cloud sera disponible très prochainement.</p>
            </AccordionItem>

            <AccordionItem title="Conditions d'Utilisation du Service">
              <p>En utilisant King_TCG, vous acceptez que l'ensemble des informations et estimations fournies le soient à titre purement indicatif.</p>
              <p>King_TCG ne peut être tenu responsable des variations de marché, des erreurs d'indexation ou des décisions d'achat et de vente effectuées sur la base des données présentées dans l'application.</p>
            </AccordionItem>

            <AccordionItem title="Politique de Confidentialité des Données">
              <p>Votre vie privée est une priorité. Actuellement, l'intégralité de vos données de collection reste stockée en local sur votre appareil.</p>
              <p>Nous ne vendons ni ne partageons aucune donnée personnelle. Lors du lancement des services Cloud, la synchronisation de vos informations s'effectuera uniquement avec votre consentement explicite.</p>
            </AccordionItem>

            <AccordionItem title="Raccordement Support / Contact">
              <p>Une question, une suggestion ou un problème technique à signaler ? Notre équipe est à votre écoute pour vous offrir la meilleure expérience possible.</p>
              <div className="pt-1">
                <a href="mailto:support@kingtcg.com" className="font-mono font-bold text-cyan-400 border-b border-zinc-900 hover:border-cyan-400 transition-colors text-xs">
                  support@kingtcg.com
                </a>
              </div>
              <p className="text-zinc-600 text-[11px] italic pt-1">Délai moyen de réponse : sous 24 à 48 heures (jours ouvrés).</p>
            </AccordionItem>

          </div>

          {/* Pied de page King_TCG standardisé */}
          <footer className="mt-16 text-center border-t border-zinc-900 pt-6">
            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">
              King_TCG • Collection Manager • Version 1.0
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}