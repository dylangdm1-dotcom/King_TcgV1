"use client";

import { useMemo, useState } from "react";
import {
  Award,
  Layers,
  Hash,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

type Props = {
  image: string;
  imageCandidates?: string[];
  name: string;
  set: string;
  number?: string;
  rarity?: string;
  price?: number;
  score?: number;
  trend?: "up" | "down" | "stable";
  recommendation?: string;
};

export default function CardHero({
  image,
  imageCandidates = [],
  name,
  set,
  number,
  rarity,
  price = 0,
  score = 0,
  trend = "stable",
  recommendation = "",
}: Props) {
  const candidates = useMemo(
    () => Array.from(new Set([image, ...imageCandidates, "/placeholder.png"].filter(Boolean))),
    [image, imageCandidates]
  );
  const [imageIndex, setImageIndex] = useState(0);
  const activeImage = candidates[Math.min(imageIndex, candidates.length - 1)] || "/placeholder.png";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(245px,330px)_1fr] lg:items-start lg:gap-7">
      <div className="relative mx-auto w-full max-w-[330px]">
        <div className="pointer-events-none absolute -inset-8 rounded-full bg-cyan-400/[0.07] blur-3xl" />
        <div className="relative overflow-hidden rounded-[22px] border border-cyan-400/22 bg-[#0a1118] p-3 shadow-[0_28px_70px_rgba(0,0,0,.50),0_0_30px_rgba(34,211,238,.04)]">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-cyan-300/70 shadow-[0_0_12px_rgba(34,211,238,.8)]" />
          <img
            src={activeImage}
            alt={name}
            onError={() => setImageIndex((current) => Math.min(current + 1, candidates.length - 1))}
            className="relative z-10 block w-full rounded-[17px] object-cover shadow-[0_22px_52px_rgba(0,0,0,.48)] transition duration-300 hover:scale-[1.015]"
          />
          <div className="pointer-events-none absolute inset-3 rounded-[17px] bg-gradient-to-tr from-transparent via-white/[0.025] to-cyan-300/[0.06]" />
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
            <Sparkles className="h-3 w-3" />
            Fiche marché King_TCG
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
            {name}
          </h1>
          <p className="mt-1.5 text-[12px] font-semibold text-zinc-300">{set}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/18 bg-cyan-400/[0.05] px-2.5 py-1.5 text-[9px] font-black text-cyan-200">
            <Layers className="h-3.5 w-3.5" /> {set}
          </span>
          {number ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-white/[0.03] px-2.5 py-1.5 text-[9px] font-black text-zinc-200">
              <Hash className="h-3.5 w-3.5 text-cyan-300" /> {number}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/16 bg-amber-400/[0.05] px-2.5 py-1.5 text-[9px] font-black text-amber-200">
            <Award className="h-3.5 w-3.5" /> {rarity || "Standard"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-[16px] border border-white/[0.08] bg-[#0c141c] p-2.5">
          <HeroMetric label="Cote King_TCG" value={price > 0 ? `${price.toFixed(2)} €` : "—"} />
          <HeroMetric label="Score" value={score > 0 ? `${score}/10` : "—"} />
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-2.5 py-2.5">
            <span className="block text-[8px] font-black uppercase tracking-[0.11em] text-zinc-500">Tendance</span>
            {trend === "up" ? (
              <span className="mt-1.5 flex items-center gap-1 text-[11px] font-black text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" /> Hausse
              </span>
            ) : trend === "down" ? (
              <span className="mt-1.5 flex items-center gap-1 text-[11px] font-black text-rose-300">
                <TrendingDown className="h-3.5 w-3.5" /> Baisse
              </span>
            ) : (
              <span className="mt-1.5 flex items-center gap-1 text-[11px] font-black text-zinc-300">
                <Minus className="h-3.5 w-3.5" /> Stable
              </span>
            )}
          </div>
        </div>

        {recommendation ? (
          <div className="rounded-[15px] border border-cyan-400/14 bg-cyan-400/[0.035] px-3.5 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-300">Lecture King_TCG</p>
            <p className="mt-1.5 line-clamp-2 text-[10px] font-semibold leading-4 text-zinc-300">{recommendation}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-2.5 py-2.5">
      <span className="block text-[8px] font-black uppercase tracking-[0.11em] text-zinc-500">{label}</span>
      <span className="mt-1.5 block truncate text-[11px] font-black text-white tabular-nums">{value}</span>
    </div>
  );
}
