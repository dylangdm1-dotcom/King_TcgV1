import Link from "next/link";
import { ChevronRight, FileText, Scale, ShieldCheck, Users } from "lucide-react";
import Navbar from "../../../components/Navbar";

const items = [
  {
    href: "/parametres/legal/conditions",
    title: "Conditions d’utilisation",
    description: "Règles d’utilisation de King_TCG, estimations, scanner et services externes.",
    icon: FileText,
  },
  {
    href: "/parametres/legal/confidentialite",
    title: "Confidentialité & données",
    description: "Données actuellement stockées, caméra, analytics et futurs comptes Cloud.",
    icon: ShieldCheck,
  },
];

export default function LegalPage() {
  return (
    <>
      <Navbar />
      <main className="kt-premium-shell min-h-screen pb-32 text-white">
        <div className="kt-page-wrap space-y-5">
          <Link href="/parametres" className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.055] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.10em] text-cyan-200">
            ← Retour aux paramètres
          </Link>

          <header className="kt-page-header kt-hero-surface relative overflow-hidden border">
            <div className="relative flex items-center gap-4">
              <span className="kt-page-icon flex shrink-0 items-center justify-center text-cyan-300"><Scale className="h-5 w-5" /></span>
              <div>
                <h1 className="kt-page-title">Informations légales</h1>
                <p className="kt-page-subtitle mt-1">Documents préparatoires de King_TCG pendant la phase bêta.</p>
              </div>
            </div>
          </header>

          <div className="rounded-[16px] border border-amber-300/25 bg-amber-300/[0.055] p-4 text-[10px] leading-5 text-zinc-200">
            <p className="font-black text-amber-200">Phase de préparation</p>
            <p className="mt-1">Le modèle associatif King_TCG est envisagé mais l’association n’est pas encore déclarée. Aucun numéro RNA, SIREN, statut d’adhérent payant ou cotisation associative n’est présenté comme actif dans cette version.</p>
          </div>

          <section className="kt-panel overflow-hidden">
            {items.map(({ href, title, description, icon: Icon }, index) => (
              <Link key={href} href={href} className={`group flex items-center gap-4 p-4 transition hover:bg-cyan-400/[0.025] sm:p-5 ${index ? "border-t border-white/[0.06]" : ""}`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-300"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-black text-cyan-300">{title}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-zinc-300">{description}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-cyan-300" />
              </Link>
            ))}
          </section>

          <section className="kt-panel p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#f5c451]" />
              <div className="text-[10px] leading-5 text-zinc-300">
                <p className="font-black text-white">Projet associatif envisagé</p>
                <p className="mt-1">L’objectif étudié est de maintenir un accès communautaire gratuit et, après création effective de l’association, de pouvoir réserver certains services supplémentaires aux adhérents. Les modalités définitives d’adhésion, de cotisation, de gouvernance et de paiement seront publiées uniquement après validation administrative.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
