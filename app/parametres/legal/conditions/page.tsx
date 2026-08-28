import Link from "next/link";
import Navbar from "../../../../components/Navbar";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <article className="kt-page-wrap space-y-5">
          <Link href="/parametres/legal" className="inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.10em] text-cyan-200">← Informations légales</Link>
          <header className="kt-page-header kt-hero-surface border"><h1 className="kt-page-title">Conditions d’utilisation</h1><p className="kt-page-subtitle mt-1">Version préparatoire — bêta King_TCG</p></header>
          <section className="kt-panel space-y-5 p-4 text-[11px] leading-5 text-zinc-200 sm:p-5">
            <div><h2 className="font-black text-cyan-300">1. Objet</h2><p className="mt-1">King_TCG est un outil indépendant destiné à accompagner les collectionneurs de cartes Pokémon TCG : recherche, scanner, suivi de collection, comparaison de données de marché et outils d’analyse.</p></div>
            <div><h2 className="font-black text-cyan-300">2. Phase bêta</h2><p className="mt-1">Le service est encore en développement. Des fonctions peuvent être modifiées, interrompues ou corrigées. Les données locales peuvent être perdues notamment lors de la suppression des données du navigateur.</p></div>
            <div><h2 className="font-black text-cyan-300">3. Prix, analyses et estimations</h2><p className="mt-1">Les prix, la Cote King_TCG, projections, opportunités et estimations PSA sont fournis à titre informatif à partir des données disponibles. Ils ne constituent ni une garantie de prix de vente, ni un conseil financier, ni une certification officielle de grade.</p></div>
            <div><h2 className="font-black text-cyan-300">4. Scanner et contenus soumis</h2><p className="mt-1">L’accès à la caméra sert à capturer les cartes que l’utilisateur choisit de scanner. L’utilisateur reste responsable des contenus qu’il soumet et de son utilisation du service.</p></div>
            <div><h2 className="font-black text-cyan-300">5. Sources et services tiers</h2><p className="mt-1">King_TCG peut afficher des informations provenant de services externes. Leur disponibilité, exactitude et conditions d’accès dépendent de ces services. Une source indisponible ne doit pas conduire King_TCG à inventer une donnée.</p></div>
            <div><h2 className="font-black text-cyan-300">6. Propriété intellectuelle et indépendance</h2><p className="mt-1">King_TCG est un projet indépendant et n’est pas une application officielle de The Pokémon Company, Nintendo, Creatures ou GAME FREAK. Les marques, noms, illustrations et autres contenus appartenant à des tiers restent la propriété de leurs titulaires respectifs.</p></div>
            <div><h2 className="font-black text-cyan-300">7. Accès et comportement</h2><p className="mt-1">L’utilisateur s’engage à ne pas détourner le service, contourner volontairement ses limitations, perturber son fonctionnement ou utiliser les fonctionnalités d’une manière illicite.</p></div>
            <div><h2 className="font-black text-cyan-300">8. Projet associatif</h2><p className="mt-1">Une structure associative est envisagée pour la suite de King_TCG. Tant qu’elle n’est pas officiellement créée et que ses règles ne sont pas publiées, aucune fonctionnalité Premium actuelle ne vaut adhésion, cotisation ou qualité de membre d’une association.</p></div>
            <div><h2 className="font-black text-cyan-300">9. Évolution du document</h2><p className="mt-1">Ces conditions sont préparatoires et devront être complétées avant l’ouverture de comptes publics, d’adhésions ou de services payants, notamment avec l’identité juridique de l’éditeur et les modalités définitives du service.</p></div>
          </section>
        </article>
      </main>
    </>
  );
}
