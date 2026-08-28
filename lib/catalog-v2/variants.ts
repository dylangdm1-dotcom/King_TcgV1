import type { CatalogVariantKindV2, CatalogVariantV2 } from "./schema";
import { normalizeCatalogToken } from "./identity";

const VARIANT_LABELS: Record<CatalogVariantKindV2, string> = {
  normal: "Normal",
  holo: "Holo",
  reverse: "Reverse",
  poke_ball: "Poké Ball",
  master_ball: "Master Ball",
  stamp: "Stamp",
  custom: "Autre variante",
};

function variantKindFromToken(token: string): CatalogVariantKindV2 {
  if (["normal", "standard", "regular", "non-holo", "non-holographic"].includes(token)) {
    return "normal";
  }
  if (["holo", "holographic", "holofoil", "foil"].includes(token)) return "holo";
  if (["reverse", "reverse-holo", "reverse-holofoil", "reverse-foil"].includes(token)) {
    return "reverse";
  }
  if (["poke-ball", "pokeball", "poke-ball-pattern"].includes(token)) return "poke_ball";
  if (["master-ball", "masterball", "master-ball-pattern"].includes(token)) return "master_ball";
  if (token.includes("stamp") || token.includes("stamped")) return "stamp";
  return "custom";
}

export function normalizeCatalogVariant(value: unknown): CatalogVariantV2 {
  const rawLabel = String(value ?? "").trim();
  const token = normalizeCatalogToken(rawLabel);
  const kind = variantKindFromToken(token);

  if (kind === "custom") {
    return {
      kind,
      label: rawLabel || VARIANT_LABELS.custom,
      ...(rawLabel ? { rawLabel } : {}),
    };
  }

  if (kind === "stamp") {
    const cleanedStamp = rawLabel
      .replace(/\b(?:stamped?|stamp)\b/gi, "")
      .replace(/[\s·_-]+/g, " ")
      .trim();
    return {
      kind,
      label: cleanedStamp ? `${VARIANT_LABELS.stamp} · ${cleanedStamp}` : VARIANT_LABELS.stamp,
      ...(rawLabel ? { rawLabel } : {}),
      ...(cleanedStamp ? { stampName: cleanedStamp } : {}),
    };
  }

  return {
    kind,
    label: VARIANT_LABELS[kind],
    ...(rawLabel && rawLabel !== VARIANT_LABELS[kind] ? { rawLabel } : {}),
  };
}

export function normalizeCatalogVariants(values: readonly unknown[]): CatalogVariantV2[] {
  const variants = values.map(normalizeCatalogVariant);
  const seen = new Set<string>();
  return variants.filter((variant) => {
    const key = `${variant.kind}:${normalizeCatalogToken(variant.stampName || variant.label)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
