import { normalizeItemText } from "../normalize";
import type { CardTraderBlueprint } from "./cardtrader-types";

function propertyValueText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return normalizeItemText(value);
  if (value && typeof value === "object") {
    return normalizeItemText(Object.values(value as Record<string, unknown>)
      .filter((entry) => typeof entry === "string" || typeof entry === "number")
      .join(" "));
  }
  return "";
}

/** Vérifie que CardTrader autorise explicitement la propriété langue française. */
export function cardTraderBlueprintSupportsFrenchV304(blueprint: Pick<CardTraderBlueprint, "editable_properties">): boolean {
  return (blueprint.editable_properties || []).some((property) => {
    if (!/language|langue/i.test(String(property.name || ""))) return false;
    return (property.possible_values || []).some((value) => {
      const text = propertyValueText(value);
      return text === "fr" || text === "french" || text === "francais" || text.includes(" french ") || text.includes(" francais ");
    });
  });
}
