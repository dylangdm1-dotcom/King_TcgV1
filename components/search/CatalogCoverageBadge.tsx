import { CheckCircle2, Clock3, Database, LoaderCircle } from "lucide-react";

type Coverage = "complete" | "partial" | "metadata_only" | "announced" | undefined;
const CONFIG = {
  complete: { label: "Complet", title: "Toutes les identités ou impressions attendues sont couvertes.", css: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200", Icon: CheckCircle2 },
  partial: { label: "Partiel", title: "La source fournit encore une couverture incomplète.", css: "border-amber-400/25 bg-amber-400/[0.08] text-amber-200", Icon: LoaderCircle },
  metadata_only: { label: "Sans cartes", title: "Extension référencée, mais le fournisseur ne publie encore aucune carte exploitable.", css: "border-zinc-400/20 bg-zinc-400/[0.06] text-zinc-300", Icon: Database },
  announced: { label: "Annoncé", title: "Extension annoncée, cartes non publiées.", css: "border-violet-400/25 bg-violet-400/[0.08] text-violet-200", Icon: Clock3 },
} as const;

export default function CatalogCoverageBadge({ coverage }: { coverage: Coverage }) {
  const config = CONFIG[coverage || "metadata_only"];
  const Icon = config.Icon;
  return <span title={config.title} className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] ${config.css}`}><Icon className="h-2.5 w-2.5" />{config.label}</span>;
}
