"use client";

import { ArrowDownRight, ArrowUpRight, BarChart3, Gauge, TrendingUp } from "lucide-react";

type Props = {
  current?: number;
  lowest?: number;
  highest?: number;
  variation?: number;
  opportunity?: string;
};

const euro = (value: number) => (!value || value <= 0 || Number.isNaN(value) ? "—" : `${value.toFixed(2)} €`);

export default function PriceStats({ current = 0, lowest = 0, highest = 0, variation = 0, opportunity = "" }: Props) {
  const safeVariation = Number.isFinite(variation) ? variation : 0;
  const positive = safeVariation > 0;
  const negative = safeVariation < 0;
  const amplitude = highest > 0 && lowest > 0 ? highest - lowest : 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="kt-section-label">
          <BarChart3 className="h-4 w-4 text-violet-300" />
          Lecture du marché
        </div>
        <p className="mt-2 text-[11px] font-medium leading-5 text-zinc-400">
          Résumé des repères suivis localement pour comprendre la position actuelle de la carte.
        </p>
      </div>

      <div className="rounded-[20px] border border-white/[0.09] bg-[#1a222c] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Prix actuellement suivi</p>
            <p className="mt-2 text-3xl font-black tracking-[-0.035em] text-white tabular-nums">{current > 0 ? euro(current) : "Calcul…"}</p>
          </div>
          <div className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black tabular-nums ${positive ? "border-emerald-300/15 bg-emerald-300/[0.07] text-emerald-200" : negative ? "border-rose-300/15 bg-rose-300/[0.07] text-rose-200" : "border-white/[0.08] bg-white/[0.03] text-zinc-300"}`}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : negative ? <ArrowDownRight className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {positive ? "+" : ""}{safeVariation.toFixed(2)} %
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-4">
          <Metric label="Bas" value={euro(lowest)} />
          <Metric label="Haut" value={euro(highest)} />
          <Metric label="Amplitude" value={amplitude > 0 ? euro(amplitude) : "—"} />
        </div>
      </div>

      <div className="rounded-[18px] border border-violet-300/14 bg-violet-300/[0.045] p-4">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-violet-200">
          <Gauge className="h-4 w-4" />
          Opportunité King_TCG
        </div>
        <p className="mt-2 text-xs font-medium leading-5 text-zinc-200">
          {opportunity || "Analyse des écarts et de l’historique en cours…"}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-black/20 px-3 py-2.5 text-center">
      <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-zinc-600">{label}</span>
      <span className="mt-1 block truncate text-[11px] font-black text-zinc-200 tabular-nums">{value}</span>
    </div>
  );
}
