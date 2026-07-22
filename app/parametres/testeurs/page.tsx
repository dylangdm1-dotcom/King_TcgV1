"use client";

import Link from "next/link";
import Navbar from "../../../components/Navbar";

export default function TesteursPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white pb-20">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">

          <Link
            href="/parametres"
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors font-black text-[9px] uppercase tracking-wider bg-neutral-950/40 border border-zinc-900 px-3 py-2 rounded-xl"
          >
            Retour paramètres
          </Link>


          <section className="rounded-xl border border-cyan-500/30 bg-neutral-950/50 p-5">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">
              Communauté King_TCG
            </span>

            <h1 className="mt-1 text-lg font-black uppercase tracking-tight">
              🎴 Nos testeurs pro !
            </h1>

            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              Les membres présentés ici participent aux tests de King_TCG
              et contribuent à améliorer l'expérience des collectionneurs.
            </p>
          </section>


          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-5">

            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 space-y-2">

              <h2 className="text-sm font-black text-white">
                Exemple Testeur
              </h2>

              <p className="text-xs text-zinc-400">
                Plateforme : <span className="text-white font-bold">Whatnot</span>
              </p>

              <p className="text-xs text-zinc-400">
                Compte :
                <span className="text-cyan-400 font-bold ml-1">
                  @pseudo
                </span>
              </p>

              <p className="pt-2 text-xs italic text-zinc-500">
                "King_TCG permet de suivre rapidement ma collection
                et mes cartes favorites."
              </p>

            </div>

          </section>


          <footer className="text-center border-t border-zinc-900 pt-6">
            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">
              King_TCG • Testeurs partenaires
            </p>
          </footer>

        </div>
      </main>
    </>
  );
}