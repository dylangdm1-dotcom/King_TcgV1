import Link from "next/link";
import Navbar from "../../../../components/Navbar";

export default function MentionsPage() {
  return (
    <><Navbar /><main className="kt-premium-shell min-h-screen pb-32 text-white"><article className="kt-page-wrap space-y-5">
      <Link href="/parametres/legal" className="inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.10em] text-cyan-200">← Informations légales</Link>
      <header className="kt-page-header kt-hero-surface border"><h1 className="kt-page-title">Mentions légales</h1><p className="kt-page-subtitle mt-1">Structure préparatoire — les identifiants officiels seront ajoutés après création de la structure porteuse.</p></header>
      <section className="kt-panel space-y-5 p-4 text-[11px] leading-5 text-zinc-200 sm:p-5">
        <div><h2 className="font-black text-cyan-300">Édition de King_TCG</h2><p className="mt-1">King_TCG est actuellement un projet indépendant en phase bêta. Le modèle d’une association loi 1901 est envisagé mais n’est pas encore déclaré. L’identité juridique complète de l’éditeur, le siège, le numéro RNA et, si applicable, le SIREN/SIRET seront publiés après leur attribution réelle.</p></div>
        <div><h2 className="font-black text-cyan-300">Hébergement</h2><p className="mt-1">La version bêta est déployée via Vercel. Les coordonnées légales exactes de l’hébergeur et l’architecture de production devront être confirmées au moment du lancement définitif.</p></div>
        <div><h2 className="font-black text-cyan-300">Contact</h2><p className="mt-1">Une adresse de contact officielle King_TCG sera publiée avant le lancement public définitif et servira notamment aux demandes relatives au service et aux données personnelles. Aucune coordonnée personnelle n’est ajoutée artificiellement dans cette version.</p></div>
        <div><h2 className="font-black text-cyan-300">Propriété intellectuelle</h2><p className="mt-1">L’interface, les textes et les éléments originaux propres à King_TCG restent soumis aux droits applicables. Les marques, noms, illustrations, cartes et contenus appartenant à des tiers restent la propriété de leurs titulaires respectifs.</p></div>
        <div><h2 className="font-black text-cyan-300">Indépendance du projet</h2><p className="mt-1">King_TCG est un projet indépendant. Il n’est pas présenté comme un service officiel, sponsorisé ou approuvé par The Pokémon Company, Nintendo, Creatures ou GAME FREAK. Les droits et conditions applicables aux contenus et marques de tiers devront être respectés indépendamment de cette mention.</p></div>
        <div><h2 className="font-black text-cyan-300">Responsabilité</h2><p className="mt-1">Les informations de prix, tendances, estimations, analyses et résultats automatisés sont fournies à titre informatif. Elles peuvent être incomplètes, différées ou erronées et ne constituent pas une garantie de valeur, de vente ou de performance future.</p></div>
      </section>
    </article></main></>
  );
}
