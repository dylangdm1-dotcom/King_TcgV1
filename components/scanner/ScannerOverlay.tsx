"use client";

import { CheckCircle2, Loader2, ScanLine } from "lucide-react";

type Props = {
  scanning?: boolean;
  hasResult?: boolean;
  statusText?: string;
  mode?: "single" | "quad";
};

const corners = [
  "left-0 top-0 rounded-tl-xl border-l-2 border-t-2",
  "right-0 top-0 rounded-tr-xl border-r-2 border-t-2",
  "bottom-0 left-0 rounded-bl-xl border-b-2 border-l-2",
  "bottom-0 right-0 rounded-br-xl border-b-2 border-r-2",
];

export default function ScannerOverlay({
  scanning = false,
  hasResult = false,
  statusText,
  mode = "single",
}: Props) {
  const stateColor = hasResult
    ? "border-emerald-400 text-emerald-300"
    : scanning
    ? "border-cyan-400 text-cyan-300"
    : "border-zinc-400 text-zinc-300";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden">
      {mode === "quad" ? (
        <div className="absolute inset-[7%] grid grid-cols-2 gap-2 rounded-[24px] border border-white/15 bg-black/10 p-2 backdrop-blur-[1px]">
          {[1, 2, 3, 4].map((slot) => (
            <div
              key={slot}
              className={`relative overflow-hidden rounded-[18px] border bg-black/10 transition-all duration-300 ${stateColor}`}
            >
              {corners.map((corner) => (
                <span
                  key={corner}
                  className={`absolute h-6 w-6 ${corner} ${stateColor}`}
                />
              ))}
              <span className="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/65 text-[10px] font-black text-white backdrop-blur-md">
                {slot}
              </span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-zinc-300 backdrop-blur-md">
                Carte {slot}
              </span>
              {scanning && !hasResult && (
                <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_16px_rgba(34,211,238,.75)] animate-scan" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`absolute left-1/2 top-1/2 aspect-[63/88] w-[74%] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border bg-black/10 transition-all duration-500 ${stateColor}`}
        >
          {corners.map((corner) => (
            <span key={corner} className={`absolute h-8 w-8 ${corner} ${stateColor}`} />
          ))}

          <div className="absolute left-[4%] top-[3.5%] flex h-[11%] w-[92%] items-center justify-between rounded-xl border border-white/10 bg-black/25 px-2.5 backdrop-blur-sm">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">
              Nom Pokémon
            </span>
            {scanning && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />}
          </div>

          <div className="absolute bottom-[8.5%] left-[5%] flex h-[8.5%] w-[42%] items-center rounded-xl border border-dashed border-white/10 bg-black/25 px-2 backdrop-blur-sm">
            <span className="text-[8px] font-black uppercase tracking-wider text-zinc-300">
              N° Carte
            </span>
          </div>

          {scanning && !hasResult && (
            <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_rgba(34,211,238,.75)] animate-scan" />
          )}
        </div>
      )}

      <div className="absolute bottom-[5%] inset-x-0 flex justify-center px-4">
        <div
          className={`flex max-w-[92%] items-center gap-2.5 rounded-2xl border px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-xl transition-all duration-300 ${
            hasResult
              ? "border-emerald-500/40 bg-emerald-950/85 text-emerald-300"
              : scanning
              ? "border-cyan-500/35 bg-[#0b0f14]/92 text-cyan-300"
              : "border-white/10 bg-[#11161d]/88 text-zinc-300"
          }`}
        >
          {hasResult ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : scanning ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-400" />
          ) : (
            <ScanLine className="h-4 w-4 shrink-0 text-zinc-400" />
          )}
          <span>
            {statusText ||
              (mode === "quad"
                ? "Placez une carte dans chaque zone"
                : "Alignez la carte dans le cadre")}
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes scanMove {
          0% { top: 4%; }
          50% { top: 94%; }
          100% { top: 4%; }
        }
        .animate-scan { animation: scanMove 1.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
