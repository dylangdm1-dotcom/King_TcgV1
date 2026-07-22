"use client";

export const dynamic = "force-dynamic";

import { useRef, useState } from "react";
import ScannerCamera, {
  type ScannerCameraHandle,
} from "../../components/scanner/ScannerCamera";
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

  const [status, setStatus] = useState(
    "Centrez la carte dans le cadre puis appuyez sur Scanner"
  );

  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [card, setCard] = useState<any>(null);

  async function scan() {
    if (!cameraRef.current) return;
    if (scanning) return;

    setScanning(true);
    setCard(null);
    setCardPreview(null);

    setStatus("Capture de la carte...");

    const image = cameraRef.current.capture();

    if (!image) {
      setStatus("Impossible de capturer l'image.");
      setScanning(false);
      return;
    }

    const img = new Image();

    img.onload = async () => {
      try {
        setStatus("Détection de la carte...");

        const result = await detectCard(img);

        if (!result) {
          setStatus("Aucune carte détectée.");
          setScanning(false);
          return;
        }

        setCardPreview(result.image);

        setStatus("Lecture du texte...");

        const ocrImage = await createOCRCrop(result.image);

        const cardName = await readCardName(ocrImage);

        if (!cardName) {
          setStatus("Impossible de lire le nom.");
          setScanning(false);
          return;
        }

        setStatus(`Recherche : ${cardName}`);

        const results = await searchCards(cardName);

        if (!results.length) {
          setStatus("Carte introuvable.");
          setScanning(false);
          return;
        }

        const found = results[0];

        if (results.length > 1) {
          console.table(
            results.slice(0, 5).map((c) => ({
              name: c.name,
              set: c.set.name,
              number: c.number,
            }))
          );
        }

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
          condition: "À estimer",
        });

        setStatus("Carte trouvée !");
      } catch (error) {
        console.error("SCAN ERROR:", error);
        setStatus("Erreur pendant le scan.");
      } finally {
        setScanning(false);
      }
    };

    img.src = image;
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white pb-20">
        <div className="mx-auto max-w-xl space-y-6 px-4 py-6">

          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
              Optics Capture Module
            </span>

            <h1 className="mt-1 text-lg font-black uppercase tracking-tight">
              King_TCG Scanner
            </h1>
          </section>

          <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950 shadow-xl">

            <ScannerCamera
              ref={cameraRef}
              onReady={() => setReady(true)}
            />

            <ScannerOverlay scanning={scanning} />

          </div>

          <div className="flex justify-center">

            <button
              onClick={scan}
              disabled={!ready || scanning}
              className="w-full rounded-xl bg-cyan-500 py-4 text-lg font-bold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {scanning ? "Analyse en cours..." : "Scanner la carte"}
            </button>

          </div>

          <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4">

            <div className="mb-3 flex items-center justify-between">

              <span className="text-xs uppercase tracking-widest text-zinc-500">
                Statut
              </span>

              {scanning && (
                <span className="animate-pulse text-cyan-400 text-sm">
                  ● Analyse...
                </span>
              )}

            </div>

            <p className="text-center text-sm font-semibold">
              {status}
            </p>

          </div>

          {cardPreview && (
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <img
                src={cardPreview}
                alt="Carte détectée"
                className="w-full"
              />
            </div>
          )}

          {card && (
            <div className="animate-fade-in border-t border-zinc-900 pt-6">

              <CardResult card={card} />

              <div className="mt-6 flex justify-center">

                <button
                  onClick={() => {
                    setCard(null);
                    setCardPreview(null);
                    setStatus(
                      "Centrez la carte dans le cadre puis appuyez sur Scanner"
                    );
                  }}
                  className="rounded-xl border border-cyan-500 px-6 py-3 font-bold text-cyan-400 transition hover:bg-cyan-500 hover:text-black"
                >
                  Scanner une autre carte
                </button>

              </div>

            </div>
          )}

        </div>
      </main>
    </>
  );
}