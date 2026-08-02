"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  getCollection,
  getQuantity,
} from "../../lib/storage";
import {
  getCardById,
} from "../../lib/pokemon";
import {
  getMarketData,
} from "../../lib/marketEngine";
import {
  getMarketHistoryDays,
  formatHistoryForGraph,
  type PricePoint,
} from "../../lib/priceHistory";

type PortfolioPoint = {
  date: number;
  day: string;
  value: number;
};

export default function PortfolioChart() {
  const [totalValue, setTotalValue] = useState(0);
  const [data, setData] = useState<PortfolioPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function calculatePortfolio() {
      try {
        setLoading(true);

        const collection = getCollection() || {};
        const ids = Object.keys(collection);

        if (ids.length === 0) {
          if (mounted) {
            setTotalValue(0);
            setData([]);
          }
          return;
        }

        const cards = await Promise.all(
          ids.map(async (id) => {
            const card = await getCardById(id);

            if (!card) {
              return null;
            }

            const quantity = getQuantity(id);

            return {
              id,
              card,
              quantity,
            };
          })
        );

        const validCards = cards.filter(
          (
            item
          ): item is {
            id: string;
            card: NonNullable<Awaited<ReturnType<typeof getCardById>>>;
            quantity: number;
          } => item !== null && item.card !== null
        );

        // =====================================================
        // 💰 VALEUR ACTUELLE RÉELLE
        // =====================================================

        let currentTotal = 0;

        for (const item of validCards) {
          const market = getMarketData(item.card);

          currentTotal +=
            market.averagePrice * item.quantity;
        }

        // =====================================================
        // 📈 HISTORIQUE RÉEL 30 JOURS
        // =====================================================
        //
        // Aucun point artificiel.
        // Si aucune donnée historique n'existe,
        // le graphique reste vide.
        //
        // =====================================================

        const historyByDate = new Map<
          string,
          {
            date: number;
            value: number;
          }
        >();

        for (const item of validCards) {
          const history = getMarketHistoryDays(
            item.id,
            30
          );

          if (!history.length) {
            continue;
          }

          for (const point of history) {
            if (!point || point.average <= 0) {
              continue;
            }

            const dateKey = new Date(
              point.date
            ).toISOString().slice(0, 10);

            const existing =
              historyByDate.get(dateKey);

            const cardValue =
              point.average * item.quantity;

            if (existing) {
              existing.value += cardValue;
            } else {
              historyByDate.set(dateKey, {
                date: point.date,
                value: cardValue,
              });
            }
          }
        }

        const portfolioHistory: PortfolioPoint[] =
          Array.from(historyByDate.values())
            .sort((a, b) => a.date - b.date)
            .map((point) => ({
              date: point.date,
              day: new Date(
                point.date
              ).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
              }),
              value: Number(
                point.value.toFixed(2)
              ),
            }));

        if (!mounted) {
          return;
        }

        setTotalValue(
          Number(currentTotal.toFixed(2))
        );

        setData(portfolioHistory);
      } catch (error) {
        console.error(
          "[King_TCG] Erreur calcul historique portefeuille :",
          error
        );

        if (mounted) {
          setTotalValue(0);
          setData([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    calculatePortfolio();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // 📊 VARIATION RÉELLE
  // =====================================================

  const firstValue =
    data.length > 0
      ? data[0].value
      : 0;

  const variation =
    firstValue > 0
      ? ((totalValue - firstValue) /
          firstValue) *
        100
      : 0;

  const isPositive =
    variation >= 0;

  return (
    <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-5 sm:p-6">
      {/* =====================================================
          EN-TÊTE
          ===================================================== */}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Historique portefeuille
          </p>

          <h2 className="mt-1 text-2xl font-black tracking-tight text-white tabular-nums sm:text-3xl">
            {totalValue.toLocaleString(
              "fr-FR",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}{" "}
            €
          </h2>

          {data.length >= 2 ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-bold">
              <span
                className={`tabular-nums ${
                  isPositive
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {isPositive ? "+" : ""}
                {variation.toFixed(2)} %
              </span>

              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                (depuis le premier relevé)
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
              Historique réel en cours de constitution
            </p>
          )}
        </div>

        <div className="self-start rounded border border-zinc-800 bg-neutral-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400 sm:self-center">
          Historique réel · 30j
        </div>
      </div>

      {/* =====================================================
          GRAPHIQUE
          ===================================================== */}

      <div className="w-full overflow-hidden rounded-lg border border-zinc-900/50 bg-neutral-950/60 p-2">
        {loading ? (
          <div className="flex h-[280px] items-center justify-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
              Chargement de l'historique...
            </p>
          </div>
        ) : data.length < 2 ? (
          <div className="flex h-[280px] flex-col items-center justify-center px-6 text-center">
            <p className="text-xs font-black uppercase tracking-wider text-zinc-500">
              Historique insuffisant
            </p>

            <p className="mt-2 max-w-sm text-[10px] font-medium leading-relaxed text-zinc-700">
              Le graphique apparaîtra automatiquement
              lorsque plusieurs relevés de prix réels
              seront disponibles.
            </p>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={280}
          >
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: -25,
                bottom: 0,
              }}
            >
              <CartesianGrid
                stroke="#171717"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="day"
                stroke="#404040"
                fontSize={10}
                fontWeight={700}
                tickLine={false}
                axisLine={false}
                dy={8}
              />

              <YAxis
                stroke="#404040"
                fontSize={10}
                fontWeight={700}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(value) =>
                  `${Number(value).toFixed(2)} €`
                }
              />

              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #171717",
                  borderRadius: 8,
                }}
                itemStyle={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#fff",
                }}
                labelStyle={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#a1a1aa",
                  textTransform: "uppercase",
                }}
                formatter={(value) => [
                  `${Number(value).toFixed(2)} €`,
                  "Portefeuille",
                ]}
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 0,
                  fill: "#22d3ee",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
