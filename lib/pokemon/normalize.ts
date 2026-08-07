export function normalizeSearchText(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCompact(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function normalizeCardNumber(value?: string | null): string {
  const raw = String(value ?? "").trim().split("/")[0].trim();
  if (!raw) return "";
  const prefix = raw.match(/^[a-z]+/i)?.[0]?.toUpperCase() ?? "";
  const digits = raw.replace(/^[a-z]+/i, "").replace(/^0+(?=\d)/, "");
  return `${prefix}${digits || "0"}`;
}
