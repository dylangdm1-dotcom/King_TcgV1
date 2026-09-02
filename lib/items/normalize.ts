export function normalizeItemText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeOptionalText(value: unknown, maxLength = 240): string | undefined {
  const normalized = String(value || "").trim().replace(/[\u0000-\u001F\u007F]/g, "");
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

export function normalizeMoney(value: unknown): number {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 100) / 100) : 0;
}
