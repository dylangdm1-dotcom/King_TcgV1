import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ItemsPageContent from "@/components/items/ItemsPageContent";

export const metadata: Metadata = {
  title: "Items Pokémon scellés | King_TCG",
  description: "Recherche, collection et favoris de produits Pokémon scellés dans un espace indépendant des cartes.",
};

export default function ItemsPage() {
  return <><Navbar /><main className="kt-premium-shell kt-items-page min-h-screen pb-32 text-white"><ItemsPageContent /></main></>;
}
