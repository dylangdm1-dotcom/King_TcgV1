"use client";

import { CheckCircle2, Loader2, ScanLine } from "lucide-react";

type Props = {
  scanning?: boolean;
  hasResult?: boolean;
  statusText?: string;
};

export default function ScannerOverlay({
  scanning = false,
  hasResult = false,
  statusText,
}: Props) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Cadre carte Pokémon (Ratio Standard 63/88) */}
      <div
        className={`
          absolute
          left-1/2
          top-1/2
          w-[74%]
          max-w-[340px]
          aspect-[63/88]
          -translate-x-1/2
          -translate-y-1/2
          rounded-2xl
          border
          transition-all
          duration-500
          ${
            hasResult
              ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              : scanning
              ? "border-cyan-400/80 bg-cyan-500/5 shadow-[0_0_25px_rgba(34,211,238,0.2)]"
              : "border-zinc-700/80 bg-black/20"
          }
        `}
      >
        {/* Coins de cadrage HUD */}
        {/* Haut Gauche */}
        <div
          className={`
            absolute -left-1 -top-1 h-7 w-7 rounded-tl-xl border-l-4 border-t-4 transition-colors duration-300
            ${hasResult ? "border-emerald-400" : scanning ? "border-cyan-400" : "border-zinc-400"}
          `}
        />

        {/* Haut Droite */}
        <div
          className={`
            absolute -right-1 -top-1 h-7 w-7 rounded-tr-xl border-r-4 border-t-4 transition-colors duration-300
            ${hasResult ? "border-emerald-400" : scanning ? "border-cyan-400" : "border-zinc-400"}
          `}
        />

        {/* Bas Gauche */}
        <div
          className={`
            absolute -bottom-1 -left-1 h-7 w-7 rounded-bl-xl border-b-4 border-l-4 transition-colors duration-300
            ${hasResult ? "border-emerald-400" : scanning ? "border-cyan-400" : "border-zinc-400"}
          `}
        />

        {/* Bas Droite */}
        <div
          className={`
            absolute -bottom-1 -right-1 h-7 w-7 rounded-br-xl border-b-4 border-r-4 transition-colors duration-300
            ${hasResult ? "border-emerald-400" : scanning ? "border-cyan-400" : "border-zinc-400"}
          `}
        />

        {/* Zone OCR Nom */}
        <div
          className={`
            absolute left-[4%] top-[3.5%] flex h-[11%] w-[92%] items-center justify-between rounded-lg border px-2.5 transition-all
            ${
              hasResult
                ? "border-emerald-500/40 bg-emerald-500/20"
                : scanning
                ? "border-cyan-400/50 bg-cyan-500/15 animate-pulse"
                : "border-zinc-700/40 bg-zinc-900/30"
            }
          `}
        >
          <span
            className={`text-[9px] font-black uppercase tracking-widest ${
              hasResult ? "text-emerald-300" : scanning ? "text-cyan-300" : "text-zinc-500"
            }`}
          >
            Nom Pokémon
          </span>
          {scanning && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />}
        </div>

        {/* Zone OCR Numéro */}
        <div
          className={`
            absolute bottom-[8.5%] left-[5%] flex h-[8.5%] w-[42%] items-center justify-between rounded-lg border border-dashed px-2 transition-all
            ${
              hasResult
                ? "border-emerald-500/40 bg-emerald-500/20"
                : scanning
                ? "border-cyan-400/50 bg-cyan-500/15 animate-pulse"
                : "border-zinc-700/40 bg-zinc-900/30"
            }
          `}
        >
          <span
            className={`text-[8px] font-black uppercase tracking-wider ${
              hasResult ? "text-emerald-300" : scanning ? "text-cyan-300" : "text-zinc-500"
            }`}
          >
            N° Carte
          </span>
        </div>

        {/* Laser / Barre de Scan Animée */}
        {scanning && !hasResult && (
          <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,1)] animate-scan" />
        )}
      </div>

      {/* Message dynamique en bas de l'overlay */}
      <div className="absolute bottom-[6%] inset-x-0 flex justify-center px-4">
        <div
          className={`
            flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md transition-all duration-300 text-center
            ${
              hasResult
                ? "border-emerald-500/60 bg-emerald-950/90 text-emerald-400 shadow-emerald-900/30"
                : scanning
                ? "border-cyan-500/60 bg-neutral-950/90 text-cyan-400 shadow-cyan-900/30"
                : "border-zinc-800 bg-neutral-950/80 text-zinc-300"
            }
          `}
        >
          {hasResult ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 animate-bounce" />
              <span>{statusText || "Carte trouvée ! Redirection..."}</span>
            </>
          ) : scanning ? (
            <>
              <Loader2 className="w-4 h-4 shrink-0 text-cyan-400 animate-spin" />
              <span>{statusText || "Analyse IA Gemini en cours..."}</span>
            </>
          ) : (
            <>
              <ScanLine className="w-4 h-4 shrink-0 text-zinc-400" />
              <span>{statusText || "Alignez la carte dans le cadre"}</span>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scanMove {
          0% {
            top: 2%;
          }
          50% {
            top: 96%;
          }
          100% {
            top: 2%;
          }
        }

        .animate-scan {
          animation: scanMove 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
