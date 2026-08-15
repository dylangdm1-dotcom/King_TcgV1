"use client";

import { CircleDollarSign, Crown, LayoutDashboard, LockKeyhole, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";

const previewColumns = ["Nom du Pokémon", "Prix de vente", "Bénéfice"] as const;

export default function SalesPage() {
  return (
    <>
      <Navbar />
      <main className="kt-app-shell min-h-screen pb-28 text-white">
        <div className="mx-auto max-w-[980px] space-y-4 px-4 py-6 sm:px-5 sm:py-8">
          <section className="relative overflow-hidden rounded-[20px] border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.075] via-[#111820] to-[#0a1017] px-4 py-5 shadow-[0_20px_55px_rgba(0,0,0,.28)] sm:px-6 sm:py-7">
            <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-amber-300/[0.07] blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-amber-300">
                  <Crown className="h-3 w-3" />
                  Premium · À venir
                </span>
                <CircleDollarSign className="h-6 w-6 text-amber-300" />
              </div>

              <h1 className="mt-4 text-xl font-black tracking-tight text-white sm:text-2xl">
                Ventes de cartes
              </h1>
              <p className="mt-2 max-w-2xl text-[11px] leading-5 text-zinc-300 sm:text-[12px]">
                Cette future fonction Premium permettra de marquer une carte comme vendue depuis son détail dans le Dashboard, puis de conserver le résultat de la vente sans la compter dans la valeur actuelle du portefeuille.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-amber-300/[0.14] bg-amber-300/[0.025]">
            <div className="border-b border-amber-300/[0.09] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-300" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-200">
                  Historique des ventes
                </h2>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-zinc-400">
                Aperçu du futur module. Aucun enregistrement de vente n’est actif pour le moment.
              </p>
            </div>

            <div className="grid grid-cols-[1.35fr_.85fr_.8fr] gap-2 border-b border-white/[0.05] px-3 py-2.5 text-[8px] font-black uppercase tracking-[0.08em] text-zinc-500 sm:px-5 sm:text-[9px]">
              {previewColumns.map((column) => (
                <span key={column} className={column === "Nom du Pokémon" ? "" : "text-right"}>
                  {column}
                </span>
              ))}
            </div>

            <div className="px-4 py-7 text-center sm:px-5 sm:py-9">
              <LockKeyhole className="mx-auto h-5 w-5 text-amber-300/70" />
              <p className="mt-2 text-[11px] font-black text-white">Fonctionnalité en préparation</p>
              <p className="mx-auto mt-1 max-w-lg text-[10px] leading-4 text-zinc-400">
                Lorsqu’elle sera activée, chaque vente affichera simplement le Pokémon vendu, son prix de vente et le bénéfice réalisé.
              </p>
            </div>
          </section>

          <section className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.045]">
                <LayoutDashboard className="h-4 w-4 text-cyan-300" />
              </span>
              <div>
                <h2 className="text-[11px] font-black text-white">Fonctionnement prévu</h2>
                <p className="mt-1 text-[10px] leading-4 text-zinc-400">
                  Dashboard détaillé d’une carte → Marquer comme vendue → saisir le prix de vente → calcul du bénéfice → ajout dans cet historique Premium.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
