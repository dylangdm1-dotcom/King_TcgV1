"use client";

type Props = {
  scanning?: boolean;
};

export default function ScannerOverlay({ scanning = false }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      
      {/* Zone d'indexation optique */}
      <div className="absolute top-[15%] left-[10%] w-[80%] height-[55%] rounded-xl border border-zinc-800 transition-colors duration-300">
        
        {/* Témoins angulaires renforcés */}
        <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 transition-colors duration-300 ${scanning ? "border-cyan-400" : "border-zinc-500"}`} />
        <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 transition-colors duration-300 ${scanning ? "border-cyan-400" : "border-zinc-500"}`} />
        <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 transition-colors duration-300 ${scanning ? "border-cyan-400" : "border-zinc-500"}`} />
        <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 transition-colors duration-300 ${scanning ? "border-cyan-400" : "border-zinc-500"}`} />
        
        {/* Filigrane d'acquisition machine */}
        {scanning && (
          <div className="absolute inset-x-0 h-[1px] bg-cyan-400/30 shadow-[0_0_8px_rgba(34,211,238,0.4)] animate-scan" />
        )}
      </div>

      {/* Label de statut d'analyse */}
      <div className="absolute bottom-[22%] inset-x-0 flex justify-center">
        <div className={`rounded border bg-neutral-950 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest tabular-nums transition-colors ${
          scanning ? "border-cyan-500/20 text-cyan-400" : "border-zinc-900 text-zinc-500"
        }`}>
          {scanning ? "Acquisition active" : "Prêt pour capture"}
        </div>
      </div>

      <style>{`
        @keyframes scanMove {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scanMove 2s linear infinite;
        }
      `}</style>
    </div>
  );
}