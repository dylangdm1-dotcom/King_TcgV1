import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import ItemLibraryPage from "@/components/items/ItemLibraryPage";

export const metadata: Metadata = { title: "Favoris Items | King_TCG" };
export default function ItemFavoritesPage() { return <><Navbar /><main className="kt-premium-shell kt-items-page min-h-screen pb-32 text-white"><ItemLibraryPage mode="favorites" /></main></>; }
