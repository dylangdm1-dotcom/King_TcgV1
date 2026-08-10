"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { searchCards, getCardById } from "../../lib/pokemon";
import type { PokemonCard } from "../../lib/types";

type PokemonContextType = {
  cards: PokemonCard[];
  loading: boolean;
  getCard: (id: string) => Promise<PokemonCard | null>;
};

const PokemonContext = createContext<PokemonContextType>({
  cards: [],
  loading: true,
  getCard: async () => null,
});

export function PokemonProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadInitialCards() {
      try {
        const results = await searchCards("");
        if (mounted) {
          setCards(results);
        }
      } catch (error) {
        console.error("[King_TCG] Erreur chargement initial index :", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadInitialCards();
    return () => {
      mounted = false;
    };
  }, []);

  async function getCard(id: string) {
    const cachedCard = cards.find((card) => card.id === id);
    if (cachedCard) return cachedCard;

    try {
      const freshCard = await getCardById(id);
      if (freshCard) {
        setCards((prev) => (prev.some((c) => c.id === id) ? prev : [...prev, freshCard]));
      }
      return freshCard;
    } catch (error) {
      console.error(`[King_TCG] Erreur récupération actif #${id} :`, error);
      return null;
    }
  }

  return (
    <PokemonContext.Provider value={{ cards, loading, getCard }}>
      {children}
    </PokemonContext.Provider>
  );
}

export function usePokemon() {
  return useContext(PokemonContext);
}