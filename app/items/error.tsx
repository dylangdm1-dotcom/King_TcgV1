"use client";

export default function ItemsError({ reset }: { error: Error; reset: () => void }) {
  return <main className="kt-premium-shell flex min-h-screen items-center justify-center p-5 text-white"><div className="kt-empty-state-rich max-w-lg"><p className="text-[12px] font-black">L’espace Items n’a pas pu s’ouvrir.</p><p className="text-[10px] text-zinc-400">Vos cartes, collections et favoris restent inchangés.</p><button type="button" onClick={reset} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-[9px] font-black text-[#061016]">Réessayer</button></div></main>;
}
