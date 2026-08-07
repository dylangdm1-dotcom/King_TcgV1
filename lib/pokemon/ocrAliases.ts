import { normalizeCompact } from "./normalize";

const OCR_ALIASES: Record<string, string> = {
  dracaufu: "dracaufeu",
  dracaufe: "dracaufeu",
  dracauf: "dracaufeu",
  charizard: "charizard",
  pikashu: "pikachu",
  pikatchu: "pikachu",
  salamche: "salameche",
  salamech: "salameche",
  carapace: "carapuce",
  ectoplasa: "ectoplasma",
  mewtwoo: "mewtwo",
  mewtoo: "mewtwo",
  florizare: "florizarre",
  evolii: "evoli",
  tortankk: "tortank",
  mirmidon: "miraidon",
  coraidon: "koraidon",
};

export function resolveOcrAlias(value: string): string {
  const key = normalizeCompact(value);
  return OCR_ALIASES[key] ?? value;
}
