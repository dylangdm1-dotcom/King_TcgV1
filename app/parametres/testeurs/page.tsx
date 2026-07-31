```tsx
"use client";

import Link from "next/link";
import Navbar from "../../../components/Navbar";

export default function TesteursPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">

          <div className="flex items-center justify-between">
            <Link
              href="/parametres"
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors font-black text-[9px] uppercase tracking-wider bg-neutral-900/60 border border-zinc-800 px-3.5 py-2 rounded-xl shadow-lg"
            >
              Retour paramètres
            </Link>
          </div>

          <section className="rounded-2xl border border-cyan-500/30 bg-neutral-900/40 p-5 sm:p-6 shadow-xl">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
              Communauté King_TCG
            </span>

            <h1 className="mt-2 text-lg font-black uppercase tracking-tight text-white">
              🎴 Nos testeurs pro !
            </h1>

            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Les membres présentés ici participent aux tests de King_TCG
              et contribuent à améliorer l'expérience des collectionneurs.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-5 sm:p-6 shadow-xl space-y-4">

            {/* TESTEUR 1 */}
            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 sm:p-5 space-y-3 shadow-md">
              <h2 className="text-sm font-black text-white uppercase tracking-tight">
                LesFratesTCG
              </h2>

              <p className="text-xs text-zinc-300 font-medium">
                Plateforme principale :
                <span className="text-white font-bold ml-1">
                  Whatnot
                </span>
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <a
                  href="https://www.whatnot.com/fr-FR/user/lesfratetcg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
                >
                  🔗 Whatnot : @lesfratetcg
                </a>

                <a
                  href="https://tiktok.com/@lesfratetcg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
                >
                  🎵 TikTok : @lesfratetcg
                </a>
              </div>

              <p className="pt-2 text-xs italic text-zinc-400 leading-relaxed">
                "Testeur partenaire King_TCG contribuant à l'amélioration
                du scanner IA et de l'expérience collectionneur."
              </p>
            </div>


            {/* TESTEUR 2 - PLACEHOLDER */}
            <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4 sm:p-5 space-y-2.5 opacity-60">
              <h2 className="text-sm font-black text-white uppercase tracking-tight">
                Testeur 2
              </h2>

              <p className="text-xs text-zinc-500 italic">
                Profil en attente d'ajout...
              </p>
            </div>


            {/* TESTEUR 3 - PLACEHOLDER */}
            <div className="rounded-2xl border border-zinc-800 bg-black/20 p-4 sm:p-5 space-y-2.5 opacity-60">
              <h2 className="text-sm font-black text-white uppercase tracking-tight">
                Testeur 3
              </h2>

              <p className="text-xs text-zinc-500 italic">
                Profil en attente d'ajout...
              </p>
            </div>

          </section>

          <footer className="mt-16 text-center border-t border-zinc-900 pt-6">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">
              King_TCG • Testeurs partenaires
            </p>
          </footer>

        </div>
      </main>
    </>
  );
}
```
