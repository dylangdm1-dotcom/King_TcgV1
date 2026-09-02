import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CardTraderReviewConsole from "@/components/items/CardTraderReviewConsole";

export const metadata: Metadata = {
  title: "Validation Items FR | King_TCG",
  description: "Console privée de validation des futurs Items Pokémon scellés français.",
};

export default function CardTraderReviewPage() {
  return <><Navbar /><main className="kt-premium-shell kt-items-page min-h-screen pb-32 text-white"><CardTraderReviewConsole /></main></>;
}
