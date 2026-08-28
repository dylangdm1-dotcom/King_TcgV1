import Link from "next/link";
import Navbar from "../../../../components/Navbar";

export default function RightsPage() {
  return (
    <><Navbar /><main className="kt-premium-shell min-h-screen pb-32 text-white"><article className="kt-page-wrap space-y-5">
      <Link href="/parametres/legal" className="inline-flex rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.10em] text-cyan-200">← Informations légales</Link>
      <header className="kt-page-header kt-hero-surface border"><h1 className="kt-page-title">Vos données & vos droits</h1><p className="kt-page-subtitle mt-1">Préparation du parcours RGPD avant l’arrivée des comptes Cloud.</p></header>
      <section className="kt-panel space-y-5 p-4 text-[11px] leading-5 text-zinc-200 sm:p-5">
        <div><h2 className="font-black text-cyan-300">Aujourd’hui : données locales</h2><p className="mt-1">La bêta conserve principalement les données fonctionnelles dans le navigateur. Les outils de réinitialisation restent dans Paramètres → Stockage & données locales afin de ne pas dupliquer les réglages techniques ici.</p></div>
        <div><h2 className="font-black text-cyan-300">Accès et rectification</h2><p className="mt-1">Lorsque les comptes Cloud seront actifs, l’utilisateur devra pouvoir connaître les données personnelles associées à son compte et demander la correction des informations inexactes.</p></div>
        <div><h2 className="font-black text-cyan-300">Effacement et suppression du compte</h2><p className="mt-1">Un parcours dédié devra permettre de demander la suppression du compte et des données qui n’ont plus à être conservées, sous réserve des obligations légales applicables.</p></div>
        <div><h2 className="font-black text-cyan-300">Limitation, opposition et consentement</h2><p className="mt-1">Ces droits seront proposés lorsqu’ils sont applicables à la base légale du traitement concerné. Lorsqu’un traitement repose sur le consentement, son retrait devra être possible sans rendre trompeuse l’information donnée à l’utilisateur.</p></div>
        <div><h2 className="font-black text-cyan-300">Portabilité</h2><p className="mt-1">Pour les traitements concernés, Work devra prévoir un export des données fournies par l’utilisateur dans un format structuré et réutilisable, sans confondre export et suppression.</p></div>
        <div><h2 className="font-black text-cyan-300">Contact et délai de traitement</h2><p className="mt-1">Avant activation des comptes publics, King_TCG devra afficher un moyen de contact officiel pour exercer ces droits et mettre en place le processus interne permettant de traiter les demandes dans les délais réglementaires.</p></div>
      </section>
    </article></main></>
  );
}
