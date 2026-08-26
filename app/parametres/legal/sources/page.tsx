import Link from "next/link";
import Navbar from "../../../../components/Navbar";

const sources = [
  ["TCGdex", "Catalogues et métadonnées de cartes", "Licence, attribution, images et conditions de réutilisation à confirmer avant production."],
  ["JustTCG", "Données de marché / prix", "Conditions API, quotas, cache et usage dans un service associatif à conserver conformes au fournisseur."],
  ["PriceCharting", "Références de prix, notamment PSA", "Mode d’accès, réutilisation, attribution et stockage à vérifier avant lancement définitif."],
  ["eBay", "Données et références de marché", "Utiliser uniquement les moyens d’accès autorisés et respecter les conditions applicables aux données affichées."],
  ["Vercel", "Hébergement et mesure d’audience actuelle", "Configuration production, données techniques et traceurs à auditer avant lancement public."],
];

export default function SourcesPage() {
  return (
    <><Navbar /><main className="kt-premium-shell min-h-screen pb-32 text-white"><article className="kt-page-wrap space-y-5">
      <Link href="/parametres/legal" className="inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.10em] text-cyan-200">← Informations légales</Link>
      <header className="kt-page-header kt-hero-surface border"><h1 className="kt-page-title">Sources, services & licences</h1><p className="kt-page-subtitle mt-1">Transparence sur les services tiers et vérifications à terminer avant production.</p></header>
      <div className="rounded-[16px] border border-amber-300/25 bg-amber-300/[0.055] p-4 text-[10px] leading-5 text-zinc-200"><p className="font-black text-amber-200">Audit en cours</p><p className="mt-1">La présence d’un fournisseur dans King_TCG ne signifie pas qu’un droit commercial, une licence étendue ou une autorisation de marque est revendiqué. Chaque intégration devra rester conforme à ses conditions réelles.</p></div>
      <section className="kt-panel overflow-hidden">
        {sources.map(([name, use, check], index) => <div key={name} className={`p-4 sm:p-5 ${index ? "border-t border-white/[0.06]" : ""}`}><h2 className="text-[12px] font-black text-cyan-300">{name}</h2><p className="mt-1 text-[10px] font-bold text-white">{use}</p><p className="mt-1 text-[10px] leading-5 text-zinc-300">{check}</p></div>)}
      </section>
      <section className="kt-panel p-4 text-[10px] leading-5 text-zinc-300 sm:p-5"><p className="font-black text-white">Marques et contenus tiers</p><p className="mt-1">Les noms, logos, cartes, illustrations et autres contenus tiers restent soumis aux droits de leurs titulaires. Work devra vérifier les licences, attributions et conditions d’usage avant toute extension ou commercialisation du service.</p></section>
    </article></main></>
  );
}
