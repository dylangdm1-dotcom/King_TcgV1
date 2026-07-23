"use client";

type Props = {
  totalValue: number;
  totalCards: number;
  averageScore: number;
  bestCard?: string;
  bestPrice?: number;
};

function StatCard({
  title,
  value,
  subtext,
  isHighlight = false,
}: {
  title: string;
  value: string;
  subtext: string;
  isHighlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 transition-all duration-200 hover:border-zinc-800">
      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
        {title}
      </p>
      <h2 className={`mt-2 text-xl font-black tracking-tight truncate tabular-nums ${
        isHighlight ? "text-cyan-400" : "text-white"
      }`}>
        {value}
      </h2>
      <p className="mt-1 text-[11px] text-zinc-500 font-medium truncate">
        {subtext}
      </p>
    </div>
  );
}

export default function DashboardStats({
  totalValue,
  totalCards,
  averageScore,
  bestCard,
  bestPrice,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Valeur estimée"
        value={`${totalValue.toFixed(2)} €`}
        subtext="Index de marché global"
        isHighlight={true}
      />
      <StatCard
        title="Volume total"
        value={String(totalCards)}
        subtext="Unités indexées"
      />
      <StatCard
        title="Score stratégique"
        value={`${averageScore.toFixed(1)}/10`}
        subtext="Moyenne de l'allocation"
      />
      <StatCard
        title="Actif majeur"
        value={bestCard || "—"}
        subtext="Plus forte pondération"
      />
      <StatCard
        title="Cotation max"
        value={bestPrice ? `${bestPrice.toFixed(2)} €` : "—"}
        subtext="Valeur unitaire plafond"
      />
    </div>
  );
}