"use client";

export const dynamic = "force-dynamic";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import ScannerCamera, {
  type ScannerCameraHandle,
} from "../../components/scanner/ScannerCamera";
import ScannerOverlay from "../../components/scanner/ScannerOverlay";

import { detectCard } from "../../lib/scanner/detection";
import { readCardName } from "../../lib/scanner/ocr";
import { createOCRCrop } from "../../lib/scanner/ocrCrop";
import { searchCards } from "../../lib/pokemon";
import { translatePokemonName } from "../../lib/pokemonTranslator";

import Navbar from "../../components/Navbar";

export default function ScannerPage() {
  const cameraRef = useRef<ScannerCameraHandle>(null);
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState(
    "Centrez la carte dans le cadre puis appuyez sur Scanner"
  );
  const [cardPreview, setCardPreview] = useState<string | null>(null);

  async function scan() {
    if (!cameraRef.current) return;
    if (scanning) return;

    setScanning(true);
    setCardPreview(null);

    try {
      setStatus("Capture de la carte...");

      const image = cameraRef.current.capture();

      if (!image) {
        setStatus("Impossible de capturer l'image.");
        return;
      }

      const img = new Image();

      img.onload = async () => {
        try {
          setStatus("Détection de la carte...");

          const result = await detectCard(img);

          if (!result) {
            setStatus("Aucune carte détectée.");
            return;
          }

          setCardPreview(result.image);

          setStatus("Lecture du nom Pokémon...");

          const ocrImage = await createOCRCrop(result.image);
          const rawName = await readCardName(ocrImage);

          if (!rawName) {
            setStatus("Impossible de lire le nom.");
            return;
          }

          console.log("OCR brut :", rawName);

          /*
            Correction :
            - enlève erreurs OCR simples
            - transforme FR -> EN
            - prépare recherche API
          */
          const correctedName = translatePokemonName(rawName);

          console.log("Nom recherché :", correctedName);

          setStatus(`Recherche : ${correctedName}`);

          const results = await searchCards(correctedName);

          if (!results.length) {
            setStatus(`Carte introuvable (${correctedName})`);
            return;
          }

          const found = results[0];

          console.log("Carte trouvée :", found);

          setStatus("Carte trouvée !");

          /*
            Redirection directe vers
            la page détail carte
          */
          router.push(`/card/${found.id}`);
        } catch (error) {
          console.error("SCAN ERROR :", error);
          setStatus("Erreur pendant l'analyse.");
        }
      };

      img.src = image;
    } finally {
      setScanning(false);
    }
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
            <ScannerCamera ref={cameraRef} onReady={() => setReady(true)} />
            <ScannerOverlay scanning={scanning} />
          </div>

          <button
            onClick={scan}
            disabled={!ready || scanning}
            className="w-full rounded-xl bg-cyan-500 py-4 text-lg font-bold text-black transition hover:bg-cyan-400 disabled:opacity-40"
          >
            {scanning ? "Analyse en cours..." : "Scanner la carte"}
          </button>

          <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4">
            <span className="text-xs uppercase tracking-widest text-zinc-500">
              Statut
            </span>

            <p className="mt-3 text-center text-sm font-semibold">{status}</p>
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
        </div>
      </main>
    </>
  );
}