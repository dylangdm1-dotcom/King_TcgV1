import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ItemDetailContent from "@/components/items/ItemDetailContent";

export const metadata: Metadata = { title: "Fiche Item | King_TCG" };

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  return <><Navbar /><main className="kt-premium-shell kt-items-page min-h-screen pb-32 text-white"><ItemDetailContent identifier={decodeURIComponent(params.id)} /></main></>;
}
