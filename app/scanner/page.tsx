"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
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

import { loadOpenCV } from "../../lib/opencv/loadOpenCV";

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

  useEffect(() => {
    loadOpenCV()
      .then(() => {
        console.log("✅ OpenCV prêt");
      })
      .catch((err) => {
        console.error("❌ OpenCV erreur", err);
      });
  }, []);

  async function scan() {
    if (!cameraRef.current || scanning) return;

    setScanning(true);
    setCardPreview(null);

    try {
      setStatus("Capture de la carte...");

      const imageDataUrl = cameraRef.current.capture();

      if (!imageDataUrl) {
        setStatus("Impossible de capturer l'image.");
        return;
      }

      // Encapsulation de img.onload dans une Promise pour attendre la fin du traitement
      await new Promise<void>((resolve) => {
        const img = new Image();

        img.onload = async () => {
          try {
            setStatus("Détection de la carte...");

            // 1. Détection OpenCV
            const result = await detectCard(img);

            if (!result) {
              setStatus("Aucune carte détectée. Rapprochez la carte.");
              return resolve();
            }

            setCardPreview(result.image);
            setStatus("Lecture du nom Pokémon...");

            // 2. Recadrage spécifique pour l'OCR & Lecture Tesseract
            const ocrImage = await createOCRCrop(result.image);
            const rawName = await readCardName(ocrImage);

            if (!rawName) {
              setStatus("Impossible de lire le nom.");
              return resolve();
            }

            console.log("OCR brut :", rawName);

            // 3. Correction & Traduction du nom
            const correctedName = translatePokemonName(rawName);
            console.log("Nom recherché :", correctedName);

            setStatus(`Recherche : ${correctedName}`);

            // 4. Appel API
            const results = await searchCards(correctedName);

            if (!results || !results.length) {
              setStatus(`Carte introuvable (${correctedName})`);
              return resolve();
            }

            const found = results[0];
            console.log("Carte trouvée :", found);

            setStatus("Carte trouvée ! Redirection...");

            // Redirection vers la fiche de la carte
            router.push(`/card/${found.id}`);
          } catch (error) {
            console.error("SCAN ERROR :", error);
            setStatus("Erreur pendant l'analyse.");
          } finally {
            resolve();
          }
        };

        img.onerror = () => {
          setStatus("Erreur lors du chargement de la capture.");
          resolve();
        };

        img.src = imageDataUrl;
      });
    } catch (err) {
      console.error("Erreur générale du scan :", err);
      setStatus("Une erreur est survenue.");
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