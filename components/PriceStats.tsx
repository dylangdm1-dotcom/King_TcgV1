"use client";

import { ArrowDownRight, ArrowUpRight, BarChart3, Gauge, TrendingUp } from "lucide-react";

type Props = {
  current?: number;
  lowest?: number;
  highest?: number;
  variation?: number;
  opportunity?: string;
  kingTcgPrice?: number;
  frenchMode?: boolean;
};

const euro = (value: number) => (!value || value <= 0 || Number.isNaN(value) ? "—" : `${value.toFixed(2)} €`);

export default function PriceStats({
  current = 0,
  lowest = 0,
  highest = 0,
  variation = 0,
  opportunity = "",
  kingTcgPrice = 0,
  frenchMode = false,
}: Props) {
  current = Number.isFinite(Number(current)) ? Number(current) : 0;
  lowest = Number.isFinite(Number(lowest)) ? Number(lowest) : 0;
  highest = Number.isFinite(Number(highest)) ? Number(highest) : 0;
  variation = Number.isFinite(Number(variation)) ? Number(variation) : 0;
  kingTcgPrice = Number.isFinite(Number(kingTcgPrice)) ? Number(kingTcgPrice) : 0;

  const safeVariation = Number.isFinite(variation) ? variation : 0;
  const positive = safeVariation > 0;
  const negative = safeVariation < 0;
  const amplitude = highest > 0 && lowest > 0 ? highest - lowest : 0;

  const frenchBase = frenchMode && kingTcgPrice > 0 ? kingTcgPrice : 0;
  const recommendedSale = frenchBase > 0 ? Number((frenchBase * 1.01).toFixed(2)) : 0;
  const recommendedMargin = frenchBase > 0 ? Number((recommendedSale - frenchBase).toFixed(2)) : 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="kt-section-label">
          <BarChart3 className="h-4 w-4 text-violet-300" />
          Lecture du marché
        </div>
        <p className="mt-2 text-[11px] font-medium leading-5 text-zinc-400">
          {frenchMode
            ? "Repères de vente calculés directement depuis la cote King_TCG française."
            : "Résumé des repères suivis localement pour comprendre la position actuelle de la carte."}
        </p>
      </div>

      <div className="rounded-[20px] border border-white/[0.09] bg-[#1a222c] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
              {frenchMode ? "Prix de vente conseillé" : "Prix actuellement suivi"}
            </p>
            <p className="mt-2 text-3xl font-black tracking-[-0.035em] text-white tabular-nums">
              {frenchMode
                ? (recommendedSale > 0 ? euro(recommendedSale) : "Calcul…")
                : (current > 0 ? euro(current) : "Calcul…")}
            </p>
          </div>
          {frenchMode ? (
            <div className="flex items-center gap-1 rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-2.5 py-1 text-[10px] font-black text-cyan-200 tabular-nums">
              <TrendingUp className="h-3.5 w-3.5" />
              +1,00 %
            </div>
          ) : (
            <div className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black tabular-nums ${positive ? "border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200" : negative ? "border-rose-300/15 bg-rose-300/[0.07] text-rose-200" : "border-white/[0.08] bg-white/[0.03] text-zinc-300"}`}>
              {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : negative ? <ArrowDownRight className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
              {positive ? "+" : ""}{safeVariation.toFixed(2)} %
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-4">
          {frenchMode ? (
            <>
              <Metric label="Cote King_TCG" value={euro(frenchBase)} tone="high" />
              <Metric label="Vente conseillée" value={euro(recommendedSale)} tone="low" />
              <Metric label="Marge conseil" value={recommendedMargin > 0 ? `+${euro(recommendedMargin)}` : "—"} />
            </>
          ) : (
            <>
              <Metric label="Bas" value={euro(lowest)} tone="low" />
              <Metric label="Haut" value={euro(highest)} tone="high" />
              <Metric label="Amplitude" value={amplitude > 0 ? euro(amplitude) : "—"} />
            </>
          )}
        </div>
      </div>

      <div className="rounded-[18px] border border-violet-300/14 bg-violet-300/[0.045] p-4">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-violet-200">
          <Gauge className="h-4 w-4" />
          Opportunité King_TCG
        </div>
        <p className="mt-2 text-xs font-medium leading-5 text-zinc-200">
          {frenchMode && frenchBase > 0
            ? `Référence actuelle ${euro(frenchBase)}. Prix de vente conseillé ${euro(recommendedSale)}, soit +1 % au-dessus de la cote King_TCG.`
            : (opportunity || "Analyse des écarts et de l’historique en cours…")}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "low" | "high" | "neutral" }) {
  const styles = tone === "low"
    ? "border-emerald-300/16 bg-emerald-300/[0.055] text-emerald-200"
    : tone === "high"
    ? "border-cyan-300/16 bg-cyan-300/[0.055] text-cyan-200"
    : "border-white/[0.05] bg-black/20 text-zinc-200";

  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2.5 text-center ${styles}`}>
      <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-60">{label}</span>
      <span className="mt-1 block truncate text-[11px] font-black tabular-nums">{value}</span>
    </div>
  );
}
