"use client";

import type { ReactNode } from "react";

export function PremiumCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[18px] border border-white/[0.08] bg-[#121821] shadow-[0_18px_50px_rgba(0,0,0,.28)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PremiumBadge({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "violet" | "emerald" | "amber";
}) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300",
    violet: "border-violet-400/20 bg-violet-400/[0.08] text-violet-300",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300",
    amber: "border-[#f5c451]/25 bg-[#f5c451]/[0.08] text-[#f5c451]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function PremiumSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-[15px] font-bold tracking-tight text-white">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p>
      )}
    </div>
  );
}
