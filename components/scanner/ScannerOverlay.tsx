"use client";

import { CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { DUAL_FRAMES, QUAD_FRAMES } from "@/lib/scanner/quadLayout";
import type { QuadSlotProgress } from "@/components/scanner/ScannerCamera";

type Props = {
  scanning?: boolean;
  hasResult?: boolean;
  statusText?: string;
  mode?: "single" | "batch" | "quad" | "listing";
  groupedCount?: 2 | 4;
  quadSlots?: QuadSlotProgress[];
  ready?: boolean;
  onScan?: () => void;
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
  groupedCount = 4,
  quadSlots = [],
  ready = false,
  onScan,
}: Props) {
  const stateColor = mode === "batch" || mode === "quad" || mode === "listing"
    ? "border-amber-300 text-amber-200"
    : hasResult
    ? "border-emerald-400 text-emerald-300"
    : scanning
    ? "border-cyan-400 text-cyan-300"
    : "border-cyan-300 text-cyan-200";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden">
      {mode === "quad" || mode === "listing" ? (
        <>
          <div className="absolute inset-0 bg-black/[0.06]" />
          {(mode === "listing" && groupedCount === 2 ? DUAL_FRAMES : QUAD_FRAMES).map((frame, index) => {
            const slot = quadSlots.find((item) => item.slot === frame.slot);
            const frameColor = slot?.status === "success"
              ? "border-emerald-400 text-emerald-300"
              : slot?.status === "review"
              ? "border-amber-300 text-amber-200"
              : slot?.status === "error"
              ? "border-rose-400 text-rose-300"
              : slot?.status === "processing" || slot?.status === "cropping" || slot?.status === "ready"
              ? "border-cyan-300 text-cyan-200"
              : mode === "listing"
              ? "border-[#f5c451] text-[#ffe29a]"
              : "border-amber-300 text-amber-200";
            const label = slot?.status === "success"
              ? `Carte ${index + 1} · OK`
              : slot?.status === "review"
              ? `Carte ${index + 1} · Vérifier`
              : slot?.status === "error"
              ? `Carte ${index + 1} · Reprendre`
              : `Carte ${index + 1}`;

            return (
              <div
                key={frame.slot}
                className={`absolute overflow-hidden rounded-[16px] border bg-black/5 transition-all duration-300 ${frameColor}`}
                style={{
                  left: `${frame.x * 100}%`,
                  top: `${frame.y * 100}%`,
                  width: `${frame.width * 100}%`,
                  height: `${frame.height * 100}%`,
                }}
              >
                {corners.map((corner) => (
                  <span
                    key={corner}
                    className={`absolute h-5 w-5 ${corner} ${frameColor}`}
                  />
                ))}
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-100 backdrop-blur-md">
                  {label}
                </span>
                {(scanning || slot?.status === "processing") && slot?.status !== "success" && (
                  <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_16px_rgba(34,211,238,.75)] animate-scan" />
                )}
              </div>
            );
          })}
          <div className={`absolute left-1/2 top-[5.5%] w-[88%] -translate-x-1/2 rounded-xl border bg-black/62 px-3 py-2 text-center text-[9px] font-black uppercase leading-4 tracking-[0.12em] backdrop-blur-md ${mode === "listing" ? "border-[#f5c451]/45 text-[#ffe29a] shadow-[0_0_18px_rgba(245,196,81,.10)]" : "border-violet-200/35 text-violet-100 shadow-[0_0_18px_rgba(167,139,250,.08)]"}`}>
            <span className="block">Placez les {mode === "listing" ? groupedCount : 4} cartes entièrement</span>
            <span className="block">dans les cadres, sans les superposer</span>
          </div>
        </>
      ) : (
        <div
          className={`kt-scanner-card-window absolute left-1/2 top-[48%] aspect-[63/88] w-[82%] max-w-[365px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border-2 bg-black/[0.06] transition-all duration-500 ${stateColor}`}
        >
          {corners.map((corner) => (
            <span key={corner} className={`absolute h-8 w-8 ${corner} ${stateColor}`} />
          ))}

          <div className="absolute left-[6%] top-[5%] flex h-[8.5%] w-[88%] items-center justify-between rounded-lg border border-cyan-300/18 bg-black/22 px-2.5 backdrop-blur-sm">
            <span className="text-[9px] font-black uppercase tracking-[0.10em] text-cyan-100/85">
              Nom Pokémon
            </span>
            {scanning && <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />}
          </div>

          <div className="absolute bottom-[4.5%] left-[6%] flex h-[6.5%] w-[38%] items-center rounded-lg border border-dashed border-cyan-300/18 bg-black/22 px-2 backdrop-blur-sm">
            <span className="text-[9px] font-black uppercase tracking-[0.10em] text-cyan-100/85">
              N° Carte
            </span>
          </div>

          {scanning && !hasResult && (
            <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_rgba(34,211,238,.75)] animate-scan" />
          )}
        </div>
      )}

      <div className="absolute bottom-[1.8%] inset-x-0 flex justify-center px-4">
        {scanning || hasResult ? (
          <div
            className={`flex max-w-[92%] items-center gap-2.5 rounded-xl border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.11em] shadow-2xl backdrop-blur-xl transition-all duration-300 ${
              hasResult
                ? "border-emerald-500/40 bg-emerald-950/85 text-emerald-300"
                : "border-cyan-500/35 bg-[#0b0f14]/92 text-cyan-300"
            }`}
          >
            {hasResult ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-400" />
            )}
            <span>{statusText || (hasResult ? "Carte identifiée" : "Analyse en cours...")}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onScan}
            disabled={!ready || !onScan}
            className={`pointer-events-auto inline-flex min-w-[62%] items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 text-[11px] font-black uppercase tracking-[0.12em] shadow-[0_12px_30px_rgba(0,0,0,.38)] backdrop-blur-md transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
              mode === "listing"
                ? "border-[#f5c451] bg-[#8a5b08]/55 text-[#fff2bf] shadow-[0_0_28px_rgba(245,196,81,.18)]"
                : mode === "quad"
                ? "border-amber-300 bg-violet-500/24 text-violet-100 shadow-[0_0_24px_rgba(245,196,81,.10)]"
                : mode === "batch"
                ? "border-amber-300 bg-sky-500/24 text-sky-100 shadow-[0_0_24px_rgba(245,196,81,.10)]"
                : "border-cyan-300 bg-cyan-500/22 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,.13)]"
            }`}
          >
            <ScanLine className={`h-4 w-4 ${
              mode === "listing"
                ? "text-[#ffe29a]"
                : mode === "quad"
                ? "text-violet-200"
                : mode === "batch"
                  ? "text-sky-200"
                  : "text-cyan-200"
            }`} />
            <span className="[text-shadow:0_0_10px_rgba(255,255,255,.12)]">
              {mode === "listing"
                ? `Ajouter ${groupedCount} cartes au listing`
                : mode === "quad"
                ? "Scanner les 4 cartes"
                : mode === "batch"
                  ? "Ajouter au Batch"
                  : "Scanner la carte"}
            </span>
          </button>
        )}
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
