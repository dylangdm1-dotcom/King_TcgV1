import type { CatalogLanguageV2 } from "./schema";

export type SearchCatalogGroupingV297 = "series" | "generation";

export type SearchCatalogSetLikeV297 = {
  id: string;
  canonicalId?: string;
  name: string;
  series?: string;
  releaseDate?: string;
};

export type SearchCatalogGroupV297<T extends SearchCatalogSetLikeV297> = {
  id: string;
  label: string;
  sets: T[];
};

const SERIES_LABELS: Partial<Record<CatalogLanguageV2, Record<string, string>>> = {
  fr: {
    "heartgold soulsilver": "HeartGold & SoulSilver",
    "mega evolution": "Méga-Évolution",
  },
  ja: {
    "black white": "Noir & Blanc",
    "diamond pearl": "Diamant & Perle",
    "mega evolution": "Méga-Évolution",
    "scarlet violet": "Écarlate & Violet",
    "sun moon": "Soleil & Lune",
    "sword shield": "Épée & Bouclier",
  },
  "zh-tw": {
    "chinese collections": "Collections chinoises",
    "simplified chinese": "Chinois simplifié",
    "scarlet violet": "Écarlate & Violet",
    "sun moon": "Soleil & Lune",
    "sword shield": "Épée & Bouclier",
  },
};

const GENERATION_ORDER = [
  "MEGA",
  "Écarlate & Violet",
  "Épée & Bouclier",
  "Soleil & Lune",
  "XY",
  "Noir & Blanc",
  "HeartGold & SoulSilver",
  "Diamant & Perle",
  "Promos",
  "Collections chinoises",
  "Séries classiques",
];

function normalizedLabel(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .trim();
}

function normalizedIdentity(set: SearchCatalogSetLikeV297): string {
  return normalizedLabel(set.canonicalId || set.id);
}

export function localizedCatalogSeriesNameV297(
  series: string | undefined,
  language: CatalogLanguageV2
): string {
  const original = String(series || "").trim();
  if (!original) return "Autres séries";
  return SERIES_LABELS[language]?.[normalizedLabel(original)] || original;
}

/**
 * Construit les sections visibles de Recherche sans recopier ni modifier les
 * fichiers du catalogue. Une identité canonique ne peut apparaître que dans
 * une seule section, même si une source live renvoie deux fois l'extension.
 */
export function groupSearchCatalogSetsV297<T extends SearchCatalogSetLikeV297>(options: {
  sets: readonly T[];
  language: CatalogLanguageV2;
  mode: SearchCatalogGroupingV297;
  generationOf: (set: T) => string;
  compareSets: (left: T, right: T) => number;
}): SearchCatalogGroupV297<T>[] {
  const uniqueSets = new Map<string, T>();
  for (const set of options.sets) {
    const identity = normalizedIdentity(set);
    if (identity && !uniqueSets.has(identity)) uniqueSets.set(identity, set);
  }

  const groups = new Map<string, SearchCatalogGroupV297<T>>();
  for (const set of Array.from(uniqueSets.values())) {
    const label = options.mode === "series"
      ? localizedCatalogSeriesNameV297(set.series, options.language)
      : options.generationOf(set);
    const id = normalizedLabel(label) || "autres-series";
    const current = groups.get(id) || { id, label, sets: [] };
    current.sets.push(set);
    groups.set(id, current);
  }

  const result = Array.from(groups.values());
  for (const group of result) group.sets.sort(options.compareSets);

  return result.sort((left, right) => {
    if (options.mode === "generation") {
      const leftIndex = GENERATION_ORDER.indexOf(left.label);
      const rightIndex = GENERATION_ORDER.indexOf(right.label);
      if (leftIndex !== rightIndex) {
        if (leftIndex < 0) return 1;
        if (rightIndex < 0) return -1;
        return leftIndex - rightIndex;
      }
    }

    const newestDifference = options.compareSets(left.sets[0], right.sets[0]);
    return newestDifference || left.label.localeCompare(right.label, "fr", { sensitivity: "base" });
  });
}
