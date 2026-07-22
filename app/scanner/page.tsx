"use client";

export const dynamic = "force-dynamic";

import { useRef, useState, useEffect } from "react";
import ScannerCamera, { type ScannerCameraHandle } from "../../components/scanner/ScannerCamera";
import ScannerOverlay from "../../components/scanner/ScannerOverlay";
import { detectCard } from "../../lib/scanner/detection";
import { readCardName } from "../../lib/scanner/ocr";
import { searchCards } from "../../lib/pokemon";
import { createOCRCrop } from "../../lib/scanner/ocrCrop";
import CardResult from "../../components/cards/CardResult";
import Navbar from "../../components/Navbar";

export default function ScannerPage() {
  const cameraRef = useRef<ScannerCameraHandle>(null);
  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("POSITIONNER ACTIF DANS LE CADRE");
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [card, setCard] = useState<any>(null);

  async function scan() {
    if (scanning || card || !cameraRef.current) return;

    setScanning(true);
    setStatus("ACQUISITION FLUX OPTIQUE...");

    const image = cameraRef.current.capture();

    if (!image) {
      setStatus("ERREUR : CAPTURE IMPOSSIBLE");
      setScanning(false);
      setTimeout(() => scan(), 2000);
      return;
    }

    const img = new Image();

    img.onload = async () => {
      setStatus("ANALYSE STRUCTURELLE...");

      const result = await detectCard(img);

      if (!result) {
        setStatus("ECHEC : AUCUN ACTIF DETECTE");
        setScanning(false);
        setTimeout(() => scan(), 2000);
        return;
      }

      setCardPreview(result.image);
      setStatus("EXTRACTION OCR TEXTE...");

      const ocrImage = await createOCRCrop(result.image);
      const cardName = await readCardName(ocrImage);

      // ✅ Correction TypeScript + évite une recherche vide
      if (!cardName) {
        setStatus("ERREUR : NOM DE CARTE NON DETECTE");
        setScanning(false);
        setTimeout(() => scan(), 2000);
        return;
      }

      setStatus("INTERROGATION INDEX CENTRAL...");

      try {
        const results = await searchCards(cardName);

        if (results.length > 0) {
          const found = results[0];

          setCard({
            id: found.id,
            name: found.name,
            set: found.set.name,
            number: found.number,
            rarity: found.rarity,
            image: result.image,
            officialImage: found.images.large,
            price: found.cardmarket?.prices?.averageSellPrice ?? 0,
            priceChange: 0,
            condition: "A ESTIMER",
          });

          setStatus("INDEXATION REUSSIE");
          setScanning(false);
        } else {
          setStatus("ALERTE : CARTE DETECTEE INCONNUE");
          setScanning(false);
          setTimeout(() => scan(), 2000);
        }
      } catch (error) {
        console.error("[King_TCG] Erreur requete indexation :", error);
        setStatus("ERREUR : PIPELINE INTERROMPU");
        setScanning(false);
        setTimeout(() => scan(), 2000);
      }
    };

    img.src = image;
  }

  useEffect(() => {
    if (!ready) return;

    const timer = setTimeout(() => scan(), 2000);

    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white pb-20 selection:bg-cyan-500/10">
        <div className="mx-auto max-w-xl space-y-6 px-4 py-6">

          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
              Optics capture module
            </span>

            <h1 className="mt-0.5 text-lg font-black uppercase tracking-tight text-white">
              King_TCG Scanner
            </h1>
          </section>

          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950 shadow-xl">
            <ScannerCamera
              ref={cameraRef}
              onReady={() => setReady(true)}
            />

            <ScannerOverlay scanning={!ready || scanning} />
          </div>

          <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-3 text-center">
            <p className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              {status}
            </p>
          </div>

          {cardPreview && card && (
            <div className="mt-6 border-t border-zinc-900 pt-6 animate-fade-in">
              <CardResult card={card} />
            </div>
          )}

        </div>
      </main>
    </>
  );
}