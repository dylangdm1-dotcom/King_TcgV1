export const SALES_STORAGE_KEY = "king_tcg_sales_v1";
export const SALES_UPDATED_EVENT = "king_tcg_sales_update";

export interface CardSale {
  id: string;
  cardId: string;
  cardName: string;
  cardNumber?: string;
  setName?: string;
  image?: string;
  quantity: number;
  unitBuyPrice: number;
  unitSalePrice: number;
  fees: number;
  condition?: string;
  printingVariant?: string;
  soldAt: string;
  createdAt: string;
}

export type NewCardSale = Omit<CardSale, "id" | "createdAt">;

function finiteAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function sanitizeSale(value: unknown): CardSale | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<CardSale>;
  const quantity = Math.max(1, Math.floor(finiteAmount(row.quantity)));
  if (!row.id || !row.cardId || !row.cardName || !row.soldAt) return null;
  return {
    id: String(row.id), cardId: String(row.cardId), cardName: String(row.cardName),
    cardNumber: row.cardNumber ? String(row.cardNumber) : undefined,
    setName: row.setName ? String(row.setName) : undefined,
    image: row.image ? String(row.image) : undefined,
    quantity,
    unitBuyPrice: finiteAmount(row.unitBuyPrice),
    unitSalePrice: finiteAmount(row.unitSalePrice),
    fees: finiteAmount(row.fees),
    condition: row.condition ? String(row.condition) : undefined,
    printingVariant: row.printingVariant ? String(row.printingVariant) : undefined,
    soldAt: String(row.soldAt),
    createdAt: row.createdAt ? String(row.createdAt) : new Date().toISOString(),
  };
}

function notifySalesUpdate() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SALES_UPDATED_EVENT));
}

export function getSales(): CardSale[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SALES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.map(sanitizeSale).filter((sale): sale is CardSale => Boolean(sale)).slice(0, 2_000)
      : [];
  } catch {
    return [];
  }
}

function saveSales(sales: CardSale[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales.slice(0, 2_000)));
  notifySalesUpdate();
}

export function addSale(input: NewCardSale): CardSale {
  const sale = sanitizeSale({
    ...input,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sale-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  });
  if (!sale) throw new Error("Vente invalide");
  saveSales([sale, ...getSales()]);
  return sale;
}

export function removeSale(id: string): CardSale | null {
  const sales = getSales();
  const sale = sales.find((entry) => entry.id === id) || null;
  if (!sale) return null;
  saveSales(sales.filter((entry) => entry.id !== id));
  return sale;
}

export function saleProfit(sale: Pick<CardSale, "quantity" | "unitBuyPrice" | "unitSalePrice" | "fees">): number {
  return sale.unitSalePrice * sale.quantity - sale.unitBuyPrice * sale.quantity - sale.fees;
}
