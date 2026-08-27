import Link from "next/link";
import Navbar from "../../../../components/Navbar";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <article className="kt-page-wrap space-y-5">
          <Link href="/parametres/legal" className="inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.10em] text-cyan-200">← Informations légales</Link>
          <header className="kt-page-header kt-hero-surface border"><h1 className="kt-page-title">Confidentialité & données</h1><p className="kt-page-subtitle mt-1">État actuel de la bêta — à compléter avant activation des comptes Cloud.</p></header>
          <section className="kt-panel space-y-5 p-4 text-[11px] leading-5 text-zinc-200 sm:p-5">
            <div><h2 className="font-black text-cyan-300">Données enregistrées localement</h2><p className="mt-1">Dans la version actuelle, la collection, les favoris, certaines données PSA, l’historique, les préférences, le thème et différents caches sont principalement enregistrés dans le navigateur de l’utilisateur. La suppression des données du navigateur peut les effacer.</p></div>
            <div><h2 className="font-black text-cyan-300">Caméra et scanner</h2><p className="mt-1">La caméra est demandée uniquement lorsqu’une fonction de scan en a besoin. Elle permet à l’utilisateur de capturer volontairement une ou plusieurs cartes pour leur identification ou leur analyse. King_TCG ne doit pas demander une permission appareil sans lien avec une fonction utilisée.</p></div>
            <div><h2 className="font-black text-cyan-300">Mesure d’audience</h2><p className="mt-1">La version actuelle intègre Vercel Analytics pour mesurer l’utilisation générale du site. Avant le lancement public définitif, sa configuration et les informations à fournir aux utilisateurs devront être vérifiées avec l’ensemble des traceurs réellement actifs.</p></div>
            <div><h2 className="font-black text-cyan-300">Services externes</h2><p className="mt-1">Certaines fonctions interrogent des fournisseurs de catalogue, de prix ou d’analyse. La documentation finale devra préciser les fournisseurs effectivement actifs, les données transmises à chacun, leur finalité et les durées de conservation applicables.</p></div>
            <div><h2 className="font-black text-cyan-300">Futurs comptes Cloud</h2><p className="mt-1">Les comptes Google, la synchronisation Cloud, les adhésions et le stockage serveur ne sont pas présentés comme actifs dans cette version. Avant leur activation, King_TCG devra informer clairement l’utilisateur des données collectées, finalités, bases légales, destinataires, durées de conservation et moyens d’exercer ses droits.</p></div>
            <div><h2 className="font-black text-cyan-300">Contrôle par l’utilisateur</h2><p className="mt-1">Les Paramètres permettent déjà de vider certains caches et de réinitialiser les données locales principales. Lors de l’arrivée des comptes Cloud, un véritable parcours d’accès, rectification et suppression du compte et de ses données devra être ajouté.</p></div>
            <div><h2 className="font-black text-cyan-300">Responsable et contact</h2><p className="mt-1">Les coordonnées juridiques définitives du responsable du traitement seront ajoutées lorsque la structure porteuse de King_TCG sera officiellement arrêtée. Aucun numéro ou statut administratif fictif n’est publié pendant cette phase préparatoire.</p></div>
          </section>
        </article>
      </main>
    </>
  );
}
