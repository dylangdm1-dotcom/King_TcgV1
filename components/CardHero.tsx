"use client";

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
  name,
  set,
  number,
  rarity,
  price = 0,
  score = 0,
  trend = "stable",
  recommendation = "",
}: Props) {
  return (
    <div className="relative grid items-center gap-7 lg:grid-cols-[minmax(280px,390px)_1fr] lg:gap-12">
      <div className="relative mx-auto w-full max-w-[390px]">
        <div className="pointer-events-none absolute -inset-10 rounded-full bg-cyan-400/[0.07] blur-3xl" />
        <div className="kt-card-stage group relative mx-auto w-fit">
          <div className="kt-card-stage-grid" />
          <div className="relative rounded-[22px] border border-white/[0.08] bg-[#111821]/95 p-3 shadow-[0_30px_80px_rgba(0,0,0,.58)] transition duration-300 group-hover:-translate-y-1 group-hover:border-cyan-400/20">
            <img
              src={image}
              alt={name}
              className="block w-[230px] rounded-[15px] object-cover shadow-[0_24px_55px_rgba(0,0,0,.52)] transition-transform duration-500 group-hover:scale-[1.018] sm:w-[280px] lg:w-[310px]"
            />
            <div className="pointer-events-none absolute inset-3 rounded-[15px] bg-gradient-to-tr from-transparent via-white/[0.035] to-cyan-300/[0.06]" />
          </div>
          <div className="mx-auto mt-4 h-px w-2/3 bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
        </div>
      </div>

      <div className="min-w-0 space-y-6 text-center lg:text-left">
        <div>
          <span className="kt-eyebrow">
            <Sparkles className="h-3.5 w-3.5" />
            Fiche marché premium
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
            {name}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-zinc-500 lg:mx-0">
            Retrouvez l’identité de la carte, ses cotations disponibles et les indicateurs King_TCG dans une vue unique.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
          <span className="kt-identity-chip">
            <Layers className="h-3.5 w-3.5" />
            {set}
          </span>
          {number ? (
            <span className="kt-identity-chip">
              <Hash className="h-3.5 w-3.5" />
              {number}
            </span>
          ) : null}
          <span className="kt-identity-chip">
            <Award className="h-3.5 w-3.5" />
            {rarity || "Série standard"}
          </span>
        </div>

        {price > 0 || score > 0 ? (
          <div className="grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-5">
            <HeroMetric label="Valeur" value={price > 0 ? `${price.toFixed(2)} €` : "—"} />
            <HeroMetric label="Score IA" value={score > 0 ? `${score}/10` : "—"} />
            <div className="kt-hero-metric">
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
                Tendance
              </span>
              {trend === "up" ? (
                <span className="mt-3 flex items-center justify-center gap-1 text-sm font-black text-emerald-400 lg:justify-start">
                  <TrendingUp className="h-4 w-4" /> Hausse
                </span>
              ) : trend === "down" ? (
                <span className="mt-3 flex items-center justify-center gap-1 text-sm font-black text-rose-400 lg:justify-start">
                  <TrendingDown className="h-4 w-4" /> Baisse
                </span>
              ) : (
                <span className="mt-3 flex items-center justify-center gap-1 text-sm font-black text-zinc-300 lg:justify-start">
                  <Minus className="h-4 w-4" /> Stable
                </span>
              )}
            </div>
          </div>
        ) : null}

        {recommendation ? (
          <div className="rounded-2xl border border-cyan-400/12 bg-cyan-400/[0.035] p-4 text-left">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">
              Lecture King_TCG
            </span>
            <p className="mt-2 text-xs font-medium leading-5 text-zinc-300">
              {recommendation}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="kt-hero-metric">
      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>
      <span className="mt-3 text-sm font-black text-white tabular-nums sm:text-base">
        {value}
      </span>
    </div>
  );
}
