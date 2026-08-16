"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Upload,
  Wallet,
  Sparkles,
  Trophy,
  ShieldAlert,
  Package,
  History,
  ChevronDown,
  ChevronUp,
  Crown,
  Globe2,
  TrendingUp,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import {
  getCollection,
  getBuyPrice,
  getCondition,
  getCardQuantity,
  getPurchaseDate,
} from "@/lib/storage";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { enrichAndCacheCards, getCardById, getCachedCardsForAnalytics } from "@/lib/pokemon";
import { getLastPrice, getMarketHistory } from "@/lib/priceHistory";
import { getInvestmentScore } from "@/lib/investment";
import {
  getMarketData,
  getAdjustedPriceByCondition,
  type MarketPrices,
} from "@/lib/marketEngine";
import type {
  CardCondition,
  PokemonCard,
} from "@/lib/types";
import ConditionValueBars, { type ConditionValueDatum } from "@/components/charts/ConditionValueBars";
import {
  cleanTCGSuffix,
  translatePokemonToFrench,
} from "@/lib/pokemonTranslator";

type DashboardCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
  };
  condition: CardCondition;
  qty: number;
  buyPrice: number;
  currentPrice: number;
  priceTrend7d: number;
  priceTrend30d: number;
  score: number;
  setId: string;
  setName: string;
  dataLanguage: "fr" | "en" | "ja" | "zh-tw";
  acquiredAt: string;
};

type MarketTrendSample = {
  id: string;
  name: string;
  setId: string;
  setName: string;
  language: "fr" | "en" | "ja" | "zh-tw";
  trend7d: number;
};

function cardLanguage(card: PokemonCard): "fr" | "en" | "ja" | "zh-tw" {
  if (card.dataLanguage) return card.dataLanguage;
  if (card.id.startsWith("tcgdex-ja-")) return "ja";
  if (card.id.startsWith("tcgdex-zh-")) return "zh-tw";
  if (card.id.startsWith("tcgdex-fr-")) return "fr";
  return "en";
}


function premiumBasePokemonName(name: string): { key: string; label: string } {
  if (!name?.trim()) return { key: "", label: "" };

  // This normalization is ONLY for the Premium Dashboard grouping.
  // It never changes the catalogue/card identity stored elsewhere.
  let cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    // Treat separators used by providers as spaces: "Mega-Charizard-EX".
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Mega cards may be written "Mega", "Méga", or simply "M".
  cleaned = cleaned
    .replace(/^(?:mega|m)\s+/i, "")
    .replace(/^(?:dark|obscur|obscure|light|lumineux|lumineuse)\s+/i, "")
    .trim();

  // Reuse King_TCG's existing TCG suffix cleaner for EX/GX/V/VMAX/VSTAR/etc.
  cleaned = cleanTCGSuffix(cleaned)
    .replace(/\s+/g, " ")
    .trim();

  // Mega Charizard X/Y should still count as Charizard.
  cleaned = cleaned
    .replace(/\s+(?:x|y)\s*$/i, "")
    .trim();

  // Canonicalise English names to the French Pokémon name already used
  // elsewhere in King_TCG: Charizard -> Dracaufeu, Eevee -> Évoli, etc.
  const french = translatePokemonToFrench(cleaned).trim() || cleaned;

  const label = french
    .split(" ")
    .map((part) =>
      part
        ? part.charAt(0).toLocaleUpperCase("fr-FR") +
          part.slice(1).toLocaleLowerCase("fr-FR")
        : part
    )
    .join(" ");

  const key = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, "");

  return { key, label };
}

function trend7dForCard(card: PokemonCard): number {
  const market = getMarketData(card);
  if (Number.isFinite(market.priceTrend7d) && Math.abs(market.priceTrend7d) > 0.001) {
    return Number(market.priceTrend7d.toFixed(2));
  }

  const history = getMarketHistory(card.id)
    .filter((point) => point?.average > 0)
    .sort((a, b) => a.date - b.date);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter((point) => point.date >= sevenDaysAgo);
  if (recent.length >= 2 && recent[0].average > 0) {
    return Number((((recent[recent.length - 1].average - recent[0].average) / recent[0].average) * 100).toFixed(2));
  }

  if (Number.isFinite(market.priceTrend30d) && Math.abs(market.priceTrend30d) > 0.001) {
    const monthlyMultiplier = Math.max(0.05, 1 + market.priceTrend30d / 100);
    return Number(((Math.pow(monthlyMultiplier, 7 / 30) - 1) * 100).toFixed(2));
  }

  return 0;
}


function formatEuro(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Construit une projection sur 7 jours.
 *
 * IMPORTANT :
 * Ces valeurs sont des projections calculées à partir
 * du prix actuel et de la tendance réelle 7j.
 * Ce ne sont PAS des données historiques.
 */
function buildSevenDayProjection(
  currentPrice: number,
  trend7d: number
): number[] {
  if (currentPrice <= 0 || !Number.isFinite(currentPrice)) {
    return [];
  }

  // Projection, pas historique : la direction générale suit la tendance
  // agrégée du portefeuille, tandis qu'une micro-volatilité bornée évite
  // une droite artificielle entre J0 et J+6. L'amplitude reste faible
  // (max ~0,45 %) et ne modifie jamais la cote de départ King_TCG.
  const safeTrend = Number.isFinite(trend7d)
    ? Math.max(-35, Math.min(35, trend7d))
    : 0;
  const weeklyMultiplier = Math.max(0.05, 1 + safeTrend / 100);
  const dailyWave = [0, 0.0026, -0.0017, 0.0034, -0.0022, 0.0015, 0];
  const trendVolatility = Math.min(0.0045, Math.abs(safeTrend) / 1000);

  return Array.from({ length: 7 }, (_, index) => {
    const progress = index / 6;
    const trendValue = currentPrice * (1 + (weeklyMultiplier - 1) * progress);
    const baseVolatility = 0.0018 + trendVolatility;
    const wave = dailyWave[index] * (baseVolatility / 0.0018);
    const value = index === 0
      ? currentPrice
      : index === 6
        ? currentPrice * weeklyMultiplier
        : trendValue * (1 + wave);

    return Number(Math.max(0.01, value).toFixed(2));
  });
}

/**
 * Graphique moderne de projection 7 jours.
 */
function SevenDayChart({ values }: { values: number[] }) {
  if (!values.length) {
    return (
      <div className="flex h-44 items-center justify-center text-[10px] font-bold text-zinc-200">
        Données de marché insuffisantes.
      </div>
    );
  }

  const first = values[0];
  const last = values[values.length - 1];
  const variation = first > 0 ? ((last - first) / first) * 100 : 0;
  const positive = variation >= 0;
  const labels = ["Auj.", "+1j", "+2j", "+3j", "+4j", "+5j", "+6j"];
  const chartData = values.map((value, index) => ({ label: labels[index], value }));
  const stroke = positive ? "#38bdf8" : "#fb7185";

  return (
    <div className="kt-chart-shell overflow-hidden rounded-[18px] border">
      <div className="kt-chart-summary grid grid-cols-3 border-b">
        <div className="p-3.5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200">Valeur actuelle</p>
          <p className="mt-1 text-sm font-black tabular-nums text-white">{formatEuro(first)} €</p>
        </div>
        <div className="border-x border-white/[0.055] p-3.5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200">Variation</p>
          <p className={`mt-1 text-sm font-black tabular-nums ${positive ? "text-sky-300" : "text-rose-300"}`}>
            {positive ? "+" : ""}{variation.toFixed(1)} %
          </p>
        </div>
        <div className="p-3.5 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-200">Projection J+6</p>
          <p className="mt-1 text-sm font-black tabular-nums text-white">{formatEuro(last)} €</p>
        </div>
      </div>

      <div className="relative h-56 px-1 pb-2 pt-4 sm:h-64 sm:px-3">
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 ${positive ? "bg-sky-400/[0.04]" : "bg-rose-300/[0.035]"}`} />
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -18, bottom: 2 }}>
            <defs>
              <linearGradient id="dashboardProjectionArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.38} />
                <stop offset="72%" stopColor={stroke} stopOpacity={0.06} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,.09)" strokeDasharray="4 7" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8794a7", fontSize: 10, fontWeight: 700 }} dy={8} />
            <YAxis domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} width={54} tick={{ fill: "#8794a7", fontSize: 9, fontWeight: 700 }} tickFormatter={(value) => `${Number(value).toFixed(0)} €`} />
            <ReferenceLine y={first} stroke="rgba(103,232,249,.28)" strokeDasharray="5 5" />
            <Tooltip
              cursor={{ stroke: "rgba(103,232,249,.20)", strokeWidth: 1 }}
              contentStyle={{ background: "rgba(7,12,18,.98)", border: "1px solid rgba(103,232,249,.22)", borderRadius: 12, boxShadow: "0 18px 42px rgba(0,0,0,.5)" }}
              labelStyle={{ color: "#94a3b8", fontSize: 10, fontWeight: 800 }}
              itemStyle={{ color: stroke, fontSize: 11, fontWeight: 900 }}
              formatter={(value) => [`${formatEuro(Number(value))} €`, "Projection"]}
            />
            <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={3} fill="url(#dashboardProjectionArea)" dot={{ r: 3, fill: "#07121a", stroke, strokeWidth: 2 }} activeDot={{ r: 6, fill: stroke, stroke: "#061016", strokeWidth: 3 }} animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [cards, setCards] =
    useState<DashboardCard[]>([]);

  const [message, setMessage] =
    useState<string | null>(null);

  const [expanded, setExpanded] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [premiumExpanded, setPremiumExpanded] =
    useState(false);

  const [marketTrendSamples, setMarketTrendSamples] =
    useState<MarketTrendSample[]>([]);

  const fileRef =
    useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setLoading(true);

      const collection =
        getCollection();

      const ids =
        Object.keys(collection);

      if (!ids.length) {
        setCards([]);
        return;
      }

      // Source marché commune : enrichAndCacheCards réutilise immédiatement le dernier
      // prix connu et ne redemande réellement l'API qu'après 6 h pour chaque carte.
      const baseCards = (await Promise.all(ids.map((id) => getCardById(id))))
        .filter((card): card is PokemonCard => Boolean(card));
      const synchronizedCards = await enrichAndCacheCards(baseCards);
      const synchronizedById = new Map(synchronizedCards.map((card) => [card.id, card]));

      // Les tendances Premium lisent uniquement le cache navigateur existant.
      // Aucun appel API n'est déclenché par l'ouverture du bloc Premium.
      const analyticsCards = getCachedCardsForAnalytics();
      setMarketTrendSamples(
        analyticsCards
          .map((card) => ({
            id: card.id,
            name: card.name,
            setId: card.set?.id || "",
            setName: card.set?.name || "Extension inconnue",
            language: cardLanguage(card),
            trend7d: trend7dForCard(card),
          }))
          .filter((item) => Number.isFinite(item.trend7d) && Math.abs(item.trend7d) > 0.001)
      );

      const loadedCards =
        await Promise.all(
          ids.map(
            async (
              id
            ): Promise<DashboardCard | null> => {
              try {
                const entry =
                  collection[id];

                if (!entry) {
                  return null;
                }

                const card =
                  synchronizedById.get(id) ?? await getCardById(id);

                if (!card) {
                  console.warn(
                    `[King_TCG] Carte introuvable pour ${id}`
                  );

                  return null;
                }

                /*
                 * IMPORTANT :
                 *
                 * La quantité vient de COLLECTION_KEY.
                 * Le prix d'achat et l'état viennent
                 * de COLLECTION_INFO_KEY.
                 *
                 * On ne lit donc PAS buyPrice depuis
                 * collection[id].
                 */
                const qty =
                  getCardQuantity(id);

                const buyPrice =
                  getBuyPrice(id);

                const condition =
                  getCondition(id);

                const market: MarketPrices =
                  getMarketData(
                    card
                  );

                // V44: Dashboard uses the same synchronized market payload as Collection.
                // Local history remains a fallback only when a provider returns no quote.
                const lastTrackedPrice = getLastPrice(card.id)?.average || 0;

                const baseCurrentPrice =
                  Number.isFinite(market.average) && market.average > 0
                    ? market.average
                    : Number.isFinite(lastTrackedPrice) && lastTrackedPrice > 0
                    ? lastTrackedPrice
                    : 0;

                const currentPrice = getAdjustedPriceByCondition(
                  baseCurrentPrice,
                  condition
                );

                const score = getInvestmentScore(
                  card,
                  getMarketHistory(card.id),
                  condition
                );

                return {
                  id: card.id,
                  name: card.name,
                  number:
                    card.number,
                  rarity:
                    card.rarity,
                  images: {
                    small:
                      card.images
                        ?.small ||
                      "",
                    large:
                      card.images
                        ?.large ||
                      "",
                  },
                  condition:
                    condition as CardCondition,
                  qty,
                  buyPrice,
                  currentPrice,
                  priceTrend7d: trend7dForCard(card),
                  priceTrend30d:
                    Number.isFinite(
                      market.priceTrend30d
                    )
                      ? market.priceTrend30d
                      : 0,
                  score,
                  setId: card.set?.id || "",
                  setName: card.set?.name || "Extension inconnue",
                  dataLanguage: cardLanguage(card),
                  acquiredAt: getPurchaseDate(id),
                };
              } catch (error) {
                console.error(
                  `[King_TCG] Dashboard card error ${id}:`,
                  error
                );

                return null;
              }
            }
          )
        );

      const validCards =
        loadedCards.filter(
          (
            card
          ): card is DashboardCard =>
            card !== null
        );

      setCards(
        validCards
      );
    } catch (error) {
      console.error(
        "[King_TCG] Dashboard refresh error:",
        error
      );

      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void refresh();
      }, 0);
    };

    window.addEventListener(
      "king_tcg_update",
      handler
    );
    window.addEventListener(
      "king_tcg_market_price_update",
      handler
    );

    window.addEventListener(
      "storage",
      handler
    );

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener(
        "king_tcg_update",
        handler
      );
      window.removeEventListener(
        "king_tcg_market_price_update",
        handler
      );

      window.removeEventListener(
        "storage",
        handler
      );
    };
  }, []);

  const stats =
    useMemo(() => {
      let investment = 0;
      let current = 0;

      for (const card of cards) {
        investment +=
          card.buyPrice *
          card.qty;

        current +=
          card.currentPrice *
          card.qty;
      }

      const profit =
        current -
        investment;

      const performance =
        investment > 0
          ? (profit /
              investment) *
            100
          : 0;

      return {
        investment,
        current,
        profit,
        performance,
      };
    }, [cards]);

  const scoredCards =
    useMemo(() => {
      return [
        ...cards,
      ].sort(
        (a, b) =>
          b.score -
          a.score
      );
    }, [cards]);

  const strategicScoreGlobal =
    useMemo(() => {
      if (!cards.length) {
        return 0;
      }

      return Number(
        (
          cards.reduce(
            (
              sum,
              card
            ) =>
              sum +
              card.score,
            0
          ) /
          cards.length
        ).toFixed(1)
      );
    }, [cards]);

  const featured =
    scoredCards[0] ||
    null;

  const topPerformances =
    useMemo(() => {
      return [
        ...cards,
      ]
        .sort(
          (a, b) => {
            const gainA =
              a.buyPrice >
              0
                ? ((a.currentPrice -
                    a.buyPrice) /
                    a.buyPrice) *
                  100
                : 0;

            const gainB =
              b.buyPrice >
              0
                ? ((b.currentPrice -
                    b.buyPrice) /
                    b.buyPrice) *
                  100
                : 0;

            return (
              gainB -
              gainA
            );
          }
        )
        .slice(0, 3);
    }, [cards]);

  const averageTrend7d =
    useMemo(() => {
      const weighted = cards
        .filter((card) => card.currentPrice > 0 && card.qty > 0 && Number.isFinite(card.priceTrend7d))
        .map((card) => ({
          weight: card.currentPrice * card.qty,
          trend: card.priceTrend7d,
        }));

      const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
      if (totalWeight <= 0) return 0;

      return Number((
        weighted.reduce((sum, item) => sum + item.trend * item.weight, 0) / totalWeight
      ).toFixed(2));
    }, [cards]);

  const conditionValueData =
    useMemo<ConditionValueDatum[]>(() => {
      const order: CardCondition[] = [
        "Near Mint",
        "Excellent",
        "Good",
        "Light Played",
        "Played",
        "Poor",
      ];

      return order.map((condition) => {
        const matching = cards.filter((card) => card.condition === condition);
        return {
          condition,
          count: matching.reduce((sum, card) => sum + card.qty, 0),
          value: matching.reduce((sum, card) => sum + card.currentPrice * card.qty, 0),
        };
      });
    }, [cards]);


  const pokemonMarketAnalysis = useMemo(() => {
    // Premium Dashboard only:
    // use the REAL Dashboard collection (including quantities), not the analytics
    // cache, so 5+ owned cards of the same Pokémon are enough to form a group.
    const groups = new Map<
      string,
      {
        label: string;
        cards: DashboardCard[];
        totalQty: number;
      }
    >();

    cards.forEach((card) => {
      const pokemon = premiumBasePokemonName(card.name);
      if (!pokemon.key) return;

      const group = groups.get(pokemon.key) || {
        label: pokemon.label,
        cards: [],
        totalQty: 0,
      };

      group.cards.push(card);
      group.totalQty += Math.max(0, card.qty || 0);
      groups.set(pokemon.key, group);
    });

    const allGroups = Array.from(groups.values())
      .sort((a, b) => b.totalQty - a.totalQty);

    const trends = allGroups
      .filter((group) => group.totalQty >= 5)
      .map((group) => {
        const weighted = group.cards
          .filter((card) => Number.isFinite(card.priceTrend7d))
          .map((card) => ({
            trend: card.priceTrend7d,
            qty: Math.max(1, card.qty || 1),
          }));

        const trendWeight = weighted.reduce((sum, item) => sum + item.qty, 0);
        const average =
          trendWeight > 0
            ? weighted.reduce((sum, item) => sum + item.trend * item.qty, 0) / trendWeight
            : 0;

        const rising = group.cards.reduce(
          (sum, card) =>
            sum +
            (Number.isFinite(card.priceTrend7d) && card.priceTrend7d > 0
              ? Math.max(1, card.qty || 1)
              : 0),
          0
        );

        return {
          name: group.label,
          average: Number(average.toFixed(2)),
          rising,
          total: group.totalQty,
        };
      })
      .sort((a, b) => Math.abs(b.average) - Math.abs(a.average))
      .slice(0, 3);

    return {
      trends,
      largestGroup: allGroups[0]
        ? { name: allGroups[0].label, total: allGroups[0].totalQty }
        : null,
    };
  }, [cards]);

  const pokemonMarketTrends = pokemonMarketAnalysis.trends;

  const extensionMarketTrends = useMemo(() => {
    const groups = new Map<string, MarketTrendSample[]>();
    marketTrendSamples.forEach((item) => {
      const key = item.setId || item.setName;
      if (!key) return;
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    });

    return Array.from(groups.values())
      .filter((items) => items.length >= 10)
      .map((items) => {
        const average = items.reduce((sum, item) => sum + item.trend7d, 0) / items.length;
        const rising = items.filter((item) => item.trend7d > 0).length;
        return { name: items[0].setName, average: Number(average.toFixed(2)), rising, total: items.length };
      })
      .filter((item) => Math.abs(item.average) >= 1)
      .sort((a, b) => Math.abs(b.average) - Math.abs(a.average))
      .slice(0, 3);
  }, [marketTrendSamples]);

  const languageDistribution = useMemo(() => {
    const totals: Record<DashboardCard["dataLanguage"], number> = { fr: 0, en: 0, ja: 0, "zh-tw": 0 };
    cards.forEach((card) => { totals[card.dataLanguage] += Math.max(0, card.qty); });
    const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const labels: Array<{ key: DashboardCard["dataLanguage"]; label: string; flag: string }> = [
      { key: "fr", label: "Français", flag: "🇫🇷" },
      { key: "ja", label: "Japonais", flag: "🇯🇵" },
      { key: "zh-tw", label: "Chinois", flag: "🇨🇳" },
      { key: "en", label: "Anglais", flag: "🇬🇧" },
    ];
    return labels.map((item) => ({ ...item, count: totals[item.key], percent: total > 0 ? Number(((totals[item.key] / total) * 100).toFixed(1)) : 0 }));
  }, [cards]);


  const exportData =
    () => {
      try {
        const data =
          JSON.stringify(
            {
              version:
                "King_TCG_V5",
              exportedAt:
                new Date().toISOString(),
              cards,
            },
            null,
            2
          );

        const blob =
          new Blob(
            [data],
            {
              type: "application/json",
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href = url;

        link.download =
          `king_tcg_v5_dashboard_${new Date()
            .toISOString()
            .slice(
              0,
              10
            )}.json`;

        link.click();

        URL.revokeObjectURL(
          url
        );

        setMessage(
          "Sauvegarde exportée avec succès."
        );

        setTimeout(
          () =>
            setMessage(
              null
            ),
          4000
        );
      } catch (error) {
        console.error(
          error
        );

        setMessage(
          "Erreur lors de l'export."
        );
      }
    };

  const importData =
    (file: File) => {
      const reader =
        new FileReader();

      reader.onload =
        () => {
          try {
            const raw =
              reader.result;

            if (
              typeof raw !==
              "string"
            ) {
              throw new Error(
                "Fichier invalide"
              );
            }

            const parsed =
              JSON.parse(raw);

            if (
              !parsed ||
              typeof parsed !==
                "object"
            ) {
              throw new Error(
                "Format invalide"
              );
            }

            /*
             * L'import Dashboard reste
             * séparé de la collection réelle.
             */
            if (
              Array.isArray(
                parsed.cards
              )
            ) {
              localStorage.setItem(
                "king_tcg_dashboard_import",
                JSON.stringify(
                  parsed.cards
                )
              );
            }

            setMessage(
              "Sauvegarde importée."
            );

            void refresh();

            setTimeout(
              () =>
                setMessage(
                  null
                ),
              4000
            );
          } catch (error) {
            console.error(
              error
            );

            setMessage(
              "Erreur : fichier de sauvegarde invalide."
            );

            setTimeout(
              () =>
                setMessage(
                  null
                ),
              4000
            );
          }
        };

      reader.readAsText(
        file
      );
    };

  return (
    <>
      <Navbar />

      <main className="kt-premium-shell kt-dashboard-page min-h-screen pb-32 text-white selection:bg-cyan-500/20">
        <div className="kt-page-wrap space-y-5">

          {/* HEADER */}
          <div className="flex items-center justify-end">

            <div className="flex items-center gap-2">
              <button
                onClick={
                  exportData
                }
                className="flex items-center gap-1.5 kt-secondary-button px-3 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                Exporter
              </button>

              <button
                onClick={() =>
                  fileRef.current?.click()
                }
                className="flex items-center gap-1.5 kt-secondary-button px-3 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                Importer
              </button>

              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(
                  event
                ) => {
                  const file =
                    event.target
                      .files?.[0];

                  if (file) {
                    importData(
                      file
                    );
                  }

                  event.currentTarget.value =
                    "";
                }}
              />
            </div>
          </div>

          {message && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-center text-xs font-bold text-cyan-400">
              {message}
            </div>
          )}

          {/* MAIN HEADER */}
          <section className="kt-page-header kt-rise-in kt-hero-surface relative overflow-hidden border">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.055] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-40 bg-cyan-300/55 shadow-[0_0_12px_rgba(34,211,238,.7)]" />
            <div className="relative flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-300">
                <Sparkles className="w-3 h-3" />
                Suivi portefeuille
              </div>

              <span className="text-[10px] text-zinc-200 font-bold uppercase tracking-wider">
                {cards.length}{" "}
                {cards.length >
                1
                  ? "actifs"
                  : "actif"}
              </span>
            </div>

            <div>
              <h1 className="kt-page-title">
                Dashboard <span className="text-cyan-300">King_TCG</span>
              </h1>

              <p className="kt-page-subtitle mt-1">
                Visualisez la valeur de votre collection, votre investissement et les principales tendances du marché en un coup d’œil.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-cyan-400/10 pt-4">
              <div className="kt-dashboard-summary-cell rounded-[14px] border border-cyan-400/13 bg-cyan-400/[0.035] p-3">
                <span className="text-zinc-200 text-[10px] block font-black uppercase tracking-wider">
                  Investissement
                </span>

                <span className="font-black text-white text-sm tabular-nums mt-0.5 block">
                  {formatEuro(
                    stats.investment
                  )}{" "}
                  €
                </span>
              </div>

              <div className="kt-dashboard-summary-cell rounded-[14px] border border-cyan-400/13 bg-cyan-400/[0.035] p-3">
                <span className="text-zinc-200 text-[10px] block font-black uppercase tracking-wider">
                  Profit Net
                </span>

                <span
                  className={`font-black text-sm tabular-nums mt-0.5 block ${
                    stats.profit >=
                    0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {stats.profit >=
                  0
                    ? "+"
                    : ""}
                  {formatEuro(
                    stats.profit
                  )}{" "}
                  €
                </span>
              </div>
            </div>
            </div>
          </section>

          {/* KPI */}
          <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <div className="kt-metric-tile relative flex min-h-[88px] flex-col justify-between overflow-hidden rounded-[16px] border p-3.5 transition">
              <div className="flex justify-between items-start">
                <span className="text-zinc-200 text-[10px] font-bold uppercase tracking-[0.11em]">
                  Valeur Actuelle
                </span>

                <Wallet className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-base font-black text-white tabular-nums mt-1">
                {formatEuro(
                  stats.current
                )}{" "}
                €
              </div>
            </div>

            <div className="kt-metric-tile relative flex min-h-[88px] flex-col justify-between overflow-hidden rounded-[16px] border p-3.5 transition">
              <div className="flex justify-between items-start">
                <span className="text-zinc-200 text-[10px] font-bold uppercase tracking-[0.11em]">
                  Rendement Global
                </span>

                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>

              <div
                className={`text-base font-black tabular-nums mt-1 ${
                  stats.performance >=
                  0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {stats.performance >=
                0
                  ? "+"
                  : ""}
                {stats.performance.toFixed(
                  2
                )}{" "}
                %
              </div>
            </div>

            <div className="kt-metric-tile relative flex min-h-[88px] flex-col justify-between overflow-hidden rounded-[16px] border p-3.5 transition">
              <div className="flex justify-between items-start">
                <span className="text-zinc-200 text-[10px] font-bold uppercase tracking-[0.11em]">
                  Score Stratégique
                </span>

                <ShieldAlert className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-base font-black text-white tabular-nums mt-1">
                {strategicScoreGlobal.toFixed(1)} / 10
              </div>
            </div>

            <div className="kt-metric-tile relative flex min-h-[88px] flex-col justify-between overflow-hidden rounded-[16px] border p-3.5 transition">
              <div className="flex justify-between items-start">
                <span className="text-zinc-200 text-[10px] font-bold uppercase tracking-[0.11em]">
                  Actif Phare
                </span>

                <Trophy className="w-4 h-4 text-cyan-400" />
              </div>

              <div className="text-xs font-bold text-white truncate mt-2">
                {featured?.name || (
                  <span className="text-zinc-200 font-medium italic">
                    Aucun actif
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ANALYSES */}
          <div className="space-y-4 pt-2">
            <h2 className="flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-[0.13em] text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Fluctuations & analyses de marché
            </h2>

            {/* COURBE 7 JOURS */}
            <section className="kt-section-surface overflow-hidden rounded-[20px] border p-4 sm:p-5 lg:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-200">
                    Projection portefeuille · 7 jours
                  </p>

                  <h2 className="mt-1 text-[20px] font-black tracking-tight text-white tabular-nums sm:text-[24px]">
                    {formatEuro(
                      stats.current
                    )}{" "}
                    €
                  </h2>

                  <p className="mt-0.5 text-xs font-bold flex items-center gap-1">
                    <span
                      className={
                        averageTrend7d >=
                        0
                          ? "text-sky-300"
                          : "text-rose-400"
                      }
                    >
                      {averageTrend7d >=
                      0
                        ? "+"
                        : ""}
                      {averageTrend7d.toFixed(
                        1
                      )}{" "}
                      %
                    </span>

                    <span className="text-[10px] font-medium text-zinc-200 uppercase tracking-wide">
                      Tendance agrégée 7j
                    </span>
                  </p>
                </div>

                <div className="self-start rounded-xl border border-cyan-400/18 bg-cyan-400/[0.055] px-3 py-2 text-right shadow-[0_8px_24px_rgba(34,211,238,.06)] sm:self-auto">
                  <p className="text-[9px] font-black uppercase tracking-[0.11em] text-cyan-300/75">
                    Modèle
                  </p>

                  <p className="text-[10px] font-black uppercase text-cyan-200">
                    Projection V5
                  </p>
                </div>
              </div>

              {cards.length >
                0 &&
              stats.current >
                0 ? (
                <SevenDayChart
                  values={buildSevenDayProjection(
                    stats.current,
                    averageTrend7d
                  )}
                />
              ) : (
                <div className="kt-empty-state-rich min-h-[220px]">
                  <TrendingUp className="h-7 w-7 text-cyan-300" />
                  <p className="text-[12px] font-black text-white">La courbe apparaîtra avec votre portefeuille</p>
                  <p className="max-w-md text-[11px] leading-5">Ajoutez au moins une carte cotée pour calculer la valeur actuelle, la tendance agrégée et la projection sur sept jours.</p>
                </div>
              )}

              <p className="mt-4 text-center text-[10px] font-medium leading-4 text-zinc-500">
                Projection indicative calculée depuis la cote actuelle et la tendance agrégée sur 7 jours. Elle ne représente pas un historique de ventes.
              </p>
            </section>

            {/* TOP PERFORMANCES */}
            <section className="kt-section-surface rounded-[18px] border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-cyan-400" />

                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-100">
                  Top performances
                </h2>
              </div>

              <div className="space-y-2">
                {topPerformances.length >
                0 ? (
                  topPerformances.map(
                    (
                      card
                    ) => {
                      const gain =
                        card.buyPrice >
                        0
                          ? ((card.currentPrice -
                              card.buyPrice) /
                              card.buyPrice) *
                            100
                          : 0;

                      return (
                        <div
                          key={
                            card.id
                          }
                          className="kt-history-row rounded-[13px] transition hover:bg-[#172330]"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="font-bold text-white text-xs truncate">
                              {card.name ||
                                card.id}
                            </div>

                            <div className="text-[10px] text-zinc-200 font-medium mt-0.5">
                              Achat :{" "}
                              {formatEuro(
                                card.buyPrice
                              )}{" "}
                              €
                              {" · "}
                              Cours :{" "}
                              {formatEuro(
                                card.currentPrice
                              )}{" "}
                              €
                            </div>
                          </div>

                          <div
                            className={`font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                              gain >=
                              0
                                ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10"
                                : "text-rose-400 bg-rose-500/5 border border-rose-500/10"
                            }`}
                          >
                            {gain >=
                            0
                              ? "+"
                              : ""}
                            {gain.toFixed(
                              1
                            )}{" "}
                            %
                          </div>
                        </div>
                      );
                    }
                  )
                ) : (
                  <p className="text-zinc-200 font-bold text-[11px] py-1 italic">
                    Aucune fluctuation
                    d&apos;actif à signaler.
                  </p>
                )}
              </div>
            </section>

            {/* HISTORIQUE */}
            <section className="kt-section-surface rounded-[18px] border p-4">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-violet-300" />

                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-100">
                  Historique d&apos;acquisition
                </h2>
              </div>

              {cards.length ? (
                <div className="kt-data-list">
                  {[...cards]
                    .sort((a, b) => Date.parse(b.acquiredAt || "") - Date.parse(a.acquiredAt || ""))
                    .slice(0, 3)
                    .map((card) => (
                    <div key={card.id} className="kt-history-row">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-11 w-8 shrink-0 overflow-hidden rounded-md bg-black/25">
                          <img src={card.images.small} alt="" className="h-full w-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-black text-white">{card.name}</p>
                          <p className="mt-0.5 truncate text-[10px] text-zinc-300">{card.setName} · #{card.number} · {card.condition}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-cyan-300">x{card.qty}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-300">Achat {formatEuro(card.buyPrice * card.qty)} €</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="kt-empty-state-rich min-h-[120px]">
                  <History className="h-6 w-6 text-violet-300" />
                  <p className="text-[11px] font-black text-white">Aucune acquisition enregistrée</p>
                  <p className="text-[10px]">Les cartes ajoutées et leur prix d’achat seront regroupés ici.</p>
                </div>
              )}
            </section>
          </div>

          <section className="kt-section-surface rounded-[18px] border p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-300" />
                  <h2 className="text-xs font-black uppercase tracking-[0.14em] text-white">Valeur par état</h2>
                </div>
                <p className="mt-1 text-[10px] leading-4 text-zinc-200">Vue compacte de la valeur et du volume par état.</p>
              </div>
              <Link href="/dashboard/cartes" className="shrink-0 text-[10px] font-bold uppercase tracking-[0.11em] text-amber-200 hover:text-white">Détails</Link>
            </div>
            <ConditionValueBars data={conditionValueData} />
          </section>

          {/* INVENTAIRE */}
          <div className="space-y-4 pt-2">
            <h2 className="flex items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-[0.13em] text-cyan-300">
              <Package className="w-3.5 h-3.5 text-violet-300" />
              Inventaire des actifs
              ({cards.length})
            </h2>

            <div className="space-y-2.5">
              {scoredCards.slice(0, 3).map(
                (
                  card
                ) => {
                  const isExpanded =
                    expanded ===
                    card.id;

                  const totalCurrent =
                    card.currentPrice *
                    card.qty;

                  const totalBuy =
                    card.buyPrice *
                    card.qty;

                  const profit =
                    totalCurrent -
                    totalBuy;

                  return (
                    <div
                      key={
                        card.id
                      }
                      className={`kt-dashboard-asset-card rounded-[16px] border bg-[#0a1118] shadow-[0_14px_34px_rgba(0,0,0,.18)] transition-all ${
                        isExpanded
                          ? "border-cyan-300/30 bg-cyan-400/[0.025] p-4"
                          : "border-white/[0.06] p-3.5 hover:border-cyan-300/18"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(
                            isExpanded
                              ? null
                              : card.id
                          )
                        }
                        className="w-full text-left cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-black p-0.5 flex items-center justify-center border border-zinc-800">
                            {card.images
                              ?.small ? (
                              <img
                                src={
                                  card.images
                                    .small
                                }
                                alt={
                                  card.name ||
                                  "Carte"
                                }
                                className="h-full object-contain"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-zinc-700" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-xs text-white truncate tracking-tight">
                              {card.name ||
                                card.id}
                            </h3>

                            <p className="text-[10px] text-zinc-100 font-medium mt-0.5 tabular-nums">
                              Unit. :{" "}
                              {formatEuro(
                                card.currentPrice
                              )}{" "}
                              €
                              {" · "}
                              {card.condition}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-100">
                          <span className="text-[10px] font-black px-2 py-0.5 bg-black/60 border border-zinc-800 rounded text-cyan-400">
                            x
                            {
                              card.qty
                            }
                          </span>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-200" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3.5 pt-3.5 border-t border-white/[0.09]">
                          <div className="grid grid-cols-5 gap-1.5 text-[10px]">
                            <div className="kt-premium-card-soft rounded-xl p-2.5 text-center">
                              <span className="text-zinc-200 font-medium block uppercase tracking-wider">
                                Achat
                              </span>

                              <span className="text-zinc-300 font-bold mt-1 block">
                                {formatEuro(
                                  totalBuy
                                )}{" "}
                                €
                              </span>
                            </div>

                            <div className="kt-premium-card-soft rounded-xl p-2.5 text-center">
                              <span className="text-zinc-200 font-medium block uppercase tracking-wider">
                                Actuelle
                              </span>

                              <span className="text-white font-bold mt-1 block">
                                {formatEuro(
                                  totalCurrent
                                )}{" "}
                                €
                              </span>
                            </div>

                            <div className="kt-premium-card-soft rounded-xl p-2.5 text-center">
                              <span className="text-zinc-200 font-medium block uppercase tracking-wider">
                                Profit Net
                              </span>

                              <span
                                className={`font-black mt-1 block ${
                                  profit >=
                                  0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {profit >=
                                0
                                  ? "+"
                                  : ""}
                                {formatEuro(
                                  profit
                                )}{" "}
                                €
                              </span>
                            </div>
                            <div className="kt-premium-card-soft rounded-xl p-2 text-center">
                              <span className="text-zinc-200 font-medium block uppercase tracking-wider">Unitaire</span>
                              <span className="text-zinc-300 font-bold mt-0.5 block">{formatEuro(card.buyPrice)} €</span>
                            </div>
                            <div className="kt-premium-card-soft rounded-xl p-2 text-center">
                              <span className="text-zinc-200 font-medium block uppercase tracking-wider">Rendement</span>
                              <span className={`font-bold mt-0.5 block ${card.buyPrice > 0 && card.currentPrice >= card.buyPrice ? "text-emerald-400" : "text-rose-400"}`}>
                                {card.buyPrice > 0 ? `${(((card.currentPrice - card.buyPrice) / card.buyPrice) * 100).toFixed(2)} %` : "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                            <div className="kt-premium-card-soft rounded-xl p-2">
                              <span className="text-zinc-200 font-medium block uppercase tracking-wider">
                                Tendance 7j
                              </span>

                              <span
                                className={`font-bold mt-0.5 block ${
                                  card.priceTrend7d >=
                                  0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {card.priceTrend7d >=
                                0
                                  ? "+"
                                  : ""}
                                {
                                  card.priceTrend7d
                                }{" "}
                                %
                              </span>
                            </div>

                            <div className="kt-premium-card-soft rounded-xl p-2">
                              <span className="text-zinc-200 font-medium block uppercase tracking-wider">
                                Tendance 30j
                              </span>

                              <span
                                className={`font-bold mt-0.5 block ${
                                  card.priceTrend30d >=
                                  0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {card.priceTrend30d >=
                                0
                                  ? "+"
                                  : ""}
                                {
                                  card.priceTrend30d
                                }{" "}
                                %
                              </span>
                            </div>

                            <div className="kt-premium-card-soft rounded-xl p-2">
                              <span className="text-zinc-200 font-medium block uppercase tracking-wider">
                                Score
                              </span>

                              <span className="text-cyan-400 font-bold mt-0.5 block">
                                {card.score.toFixed(
                                  1
                                )}
                                /10
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              )}

              {loading && (
                <div className="rounded-xl border border-white/[0.06] bg-[#171e28]/80 p-8 text-center">
                  <p className="text-xs font-bold text-zinc-200">
                    Chargement de la
                    collection...
                  </p>
                </div>
              )}

              {!loading &&
                cards.length ===
                  0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-[#171e28]/80 p-8 text-center">
                    <Package className="w-8 h-8 text-zinc-700 mx-auto mb-3" />

                    <p className="text-xs font-bold text-zinc-200">
                      Aucun actif dans ton
                      portefeuille.
                    </p>

                    <p className="text-[10px] text-zinc-700 mt-1">
                      Ajoute des cartes depuis
                      la section Scanner ou
                      Recherche.
                    </p>
                  </div>
                )}
            </div>

            {scoredCards.length > 3 && (
              <Link
                href="/dashboard/cartes"
                className="kt-secondary-button mt-3 flex w-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.11em]"
              >
                Voir tout l’inventaire ({scoredCards.length})
              </Link>
            )}
          </div>

          {/* ANALYSE PREMIUM — toujours en dernier dans le Dashboard */}
          <section className="overflow-hidden rounded-[20px] border border-amber-300/22 bg-[#0a1118] shadow-[0_18px_44px_rgba(0,0,0,.22),0_0_30px_rgba(245,196,81,.035)]">
            <button
              type="button"
              onClick={() => setPremiumExpanded((value) => !value)}
              className="flex w-full items-center justify-between gap-3 bg-[linear-gradient(90deg,rgba(245,196,81,.035),transparent)] p-4 text-left sm:p-5"
              aria-expanded={premiumExpanded}
            >
              <div className="flex items-center gap-2.5">
                <Crown className="h-4 w-4 text-amber-300" />
                <div>
                  <div className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-300/[0.08] px-2.5 py-1 shadow-[0_0_16px_rgba(245,196,81,.08)]">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.13em] text-[#f5c451]">Analyse Premium</h2>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-200">Tendances du marché et répartition de votre collection.</p>
                </div>
              </div>
              {premiumExpanded ? <ChevronUp className="h-4 w-4 text-amber-300" /> : <ChevronDown className="h-4 w-4 text-amber-300" />}
            </button>

            {premiumExpanded && (
              <div className="space-y-3 border-t border-white/[0.055] p-4 sm:p-5">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-[15px] border border-amber-300/10 bg-amber-300/[0.025] p-3.5">
                    <div className="mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-cyan-300" />
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-300">Tendances Pokémon · 7j</h3>
                    </div>
                    <div className="space-y-2">
                      {pokemonMarketTrends.length ? pokemonMarketTrends.map((item) => (
                        <div key={item.name} className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-[11px] font-black text-white">{item.name}</span>
                            <span className={`shrink-0 text-[11px] font-black tabular-nums ${item.average >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                              {item.average >= 0 ? "+" : ""}{item.average.toFixed(1)} %
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-zinc-200">
                            {item.rising}/{item.total} cartes en hausse · {
                              Math.abs(item.average) >= 3
                                ? "tendance forte à surveiller"
                                : Math.abs(item.average) >= 1
                                  ? "mouvement collectif détecté"
                                  : "tendance globalement stable"
                            }
                          </p>
                        </div>
                      )) : <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-600">
                          Données insuffisantes · minimum 5 cartes du même Pokémon, variantes incluses.
                        </p>
                        {pokemonMarketAnalysis.largestGroup ? (
                          <p className="text-[9px] font-bold text-zinc-500">
                            Plus grand groupe détecté : {pokemonMarketAnalysis.largestGroup.name} · {pokemonMarketAnalysis.largestGroup.total} carte{pokemonMarketAnalysis.largestGroup.total > 1 ? "s" : ""}.
                          </p>
                        ) : null}
                      </div>}
                    </div>
                  </div>

                  <div className="rounded-[15px] border border-amber-300/10 bg-amber-300/[0.025] p-3.5">
                    <div className="mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-violet-300" />
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-300">Tendances extensions · 7j</h3>
                    </div>
                    <div className="space-y-2">
                      {extensionMarketTrends.length ? extensionMarketTrends.map((item) => (
                        <div key={item.name} className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-[11px] font-black text-white">{item.name}</span>
                            <span className={`shrink-0 text-[11px] font-black tabular-nums ${item.average >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                              {item.average >= 0 ? "+" : ""}{item.average.toFixed(1)} %
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-zinc-200">{Math.round((item.rising / item.total) * 100)} % des cartes en hausse · {item.total} analysées</p>
                        </div>
                      )) : <p className="text-[10px] font-bold text-zinc-600">Données insuffisantes · minimum 10 cartes par extension.</p>}
                    </div>
                  </div>
                </div>

                <div className="rounded-[15px] border border-amber-300/10 bg-amber-300/[0.025] p-3.5">
                  <div className="mb-3 flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-amber-300" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-300">Répartition du stock par langue</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {languageDistribution.map((item) => (
                      <div key={item.key} className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-2.5">
                        <p className="text-[10px] font-bold text-zinc-100">{item.flag} {item.label}</p>
                        <p className="mt-1 text-sm font-black tabular-nums text-white">{item.percent.toFixed(1)} %</p>
                        <p className="text-[10px] text-zinc-600">{item.count} carte{item.count > 1 ? "s" : ""}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-center text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                  Analyse depuis les données déjà en cache · rafraîchissement marché Dashboard max. toutes les 2 h
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
