"use client";

import { useEffect, useState } from "react";

import Navbar from "../../components/Navbar";
import { getCollection } from "../../lib/storage";
import { getCardById } from "../../lib/pokemon";

import {
  generateAlerts,
  PriceAlert,
} from "../../lib/priceAlerts";

import type { PokemonCard } from "../../lib/types";

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const collection = getCollection();
      const ids = Object.keys(collection);

      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          return await getCardById(id);
        })
      );

      const cards: PokemonCard[] = results.filter(
        (card): card is PokemonCard => card !== null
      );

      const generated = generateAlerts(cards);

      setAlerts(generated);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "900px",
          margin: "auto",
          padding: "30px",
        }}
      >
        <h1>🔔 Alert Center</h1>

        <p style={{ color: "#666" }}>
          Détection automatique des variations importantes de ton portfolio.
        </p>

        {loading ? (
          <p>Chargement...</p>
        ) : alerts.length === 0 ? (
          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              background: "#f3f4f6",
              borderRadius: "12px",
            }}
          >
            ✅ Aucune alerte pour le moment
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              marginTop: "20px",
            }}
          >
            {alerts.map((alert, index) => (
              <div
                key={index}
                style={{
                  padding: "15px",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  background:
                    alert.type === "DROP"
                      ? "#fef2f2"
                      : alert.type === "RISE"
                      ? "#ecfdf5"
                      : "#eff6ff",
                }}
              >
                <h3>{alert.cardName}</h3>

                <p>{alert.message}</p>

                <p style={{ fontSize: "14px", color: "#666" }}>
                  Variation : {alert.changePercent.toFixed(2)}%
                </p>

                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    background:
                      alert.type === "DROP"
                        ? "#dc2626"
                        : alert.type === "RISE"
                        ? "#16a34a"
                        : "#2563eb",
                    color: "white",
                  }}
                >
                  {alert.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}