"use client";

export const dynamic = "force-dynamic";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import ScannerCamera from "../../components/scanner/ScannerCamera";
import ScannerOverlay from "../../components/scanner/ScannerOverlay";
import { captureFrame } from "../../lib/scanner/capture";
import { lookupPokemonCard } from "../../lib/scanner/pokemonLookup";
import Navbar from "../../components/Navbar";

interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
}

export default function ScannerPage() {
  const cameraRef = useRef<ScannerCameraHandle>(null);
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState(
    "Alignez la carte dans le cadre et appuyez sur Scanner"
  );

  const [detectedCard, setDetectedCard] = useState<{
    name: string;
    number?: string;
    set?: string;
    language?: string;
  } | null>(null);

  const handleCameraReady = useCallback(() => {
    setReady(true);
  }, []);

  async function scan() {
    if (!cameraRef.current || scanning) {
      return;
    }

    const video = cameraRef.current.getVideo();

    if (!video) {
      setStatus("Caméra non disponible.");
      return;
    }

    setScanning(true);
    setDetectedCard(null);

    try {
      /**
       * 1 - Capture de l'image vidéo
       */
      setStatus("Capture de la carte...");

      const image64 = captureFrame(video);

      if (!image64) {
        setStatus("Impossible de capturer l'image.");
        return;
      }

      /**
       * 2 - Analyse visuelle IA via Gemini 1.5 Flash
       */
      setStatus("Analyse visuelle par Gemini IA...");

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: image64 }),
      });

      const resData = await response.json();
      console.log("🔍 Réponse reçue de l'API Gemini :", resData);

      if (!resData.success || !resData.data?.cardName) {
        setStatus("Carte non reconnue. Améliorez la lumière ou le cadrage.");
        return;
      }

      const { cardName, cardNumber, set: setCode, language } = resData.data;

      setDetectedCard({
        name: cardName,
        number: cardNumber || undefined,
        set: setCode || undefined,
        language: language || undefined,
      });

      setStatus(
        `IA : ${cardName}${cardNumber ? ` (${cardNumber})` : ""}`
      );

      /**
       * 3 - Recherche dans l'API Pokémon TCG
       */
      setStatus("Recherche de la carte dans la base TCG...");

      const match = await lookupPokemonCard(cardName, cardNumber);

      if (!match) {
        setStatus(`Carte détectée (${cardName}) mais introuvable en base.`);
        return;
      }

      if (match.confidence < 50) {
        setStatus("Résultat incertain. Nouveau scan conseillé.");
        return;
      }

      setStatus(`Trouvé : ${match.card.name} (${match.confidence}%)`);

      setTimeout(() => {
        router.push(`/card/${match.card.id}`);
      }, 500);

    } catch (error) {
      console.error("Scanner Gemini error:", error);
      setStatus("Erreur pendant l'analyse IA.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white pb-20">
        <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
          
          {/* Header */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4 text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-500">
              Gemini 1.5 Flash Vision Engine
            </span>

            <h1 className="mt-1 text-lg font-black uppercase tracking-tight">
              King_TCG Scanner IA
            </h1>
          </section>

          {/* Viseur Caméra */}
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950 shadow-xl">
            <ScannerCamera ref={cameraRef} onReady={handleCameraReady} />
            <ScannerOverlay scanning={scanning} />
          </div>

          {/* Bouton d'action */}
          <button
            onClick={scan}
            disabled={!ready || scanning}
            className="w-full rounded-xl bg-cyan-500 py-4 text-lg font-bold text-black transition hover:bg-cyan-400 disabled:opacity-40 cursor-pointer"
          >
            {scanning ? "Analyse IA..." : "Scanner la carte"}
          </button>

          {/* Affichage du Statut */}
          <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4">
            <span className="text-xs uppercase tracking-widest text-zinc-500">
              Statut
            </span>

            <p className="mt-2 text-center text-sm font-semibold text-cyan-400">
              {status}
            </p>
          </div>

          {/* Prévisualisation des données lues par Gemini */}
          {detectedCard && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500">
                Détection IA réussie
              </span>

              <div className="text-base font-bold text-white">
                {detectedCard.name}
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                {detectedCard.number && (
                  <span>
                    N° : <strong className="text-zinc-200">{detectedCard.number}</strong>
                  </span>
                )}
                {detectedCard.set && (
                  <span>
                    Extension : <strong className="text-zinc-200">{detectedCard.set}</strong>
                  </span>
                )}
                {detectedCard.language && (
                  <span>
                    Langue : <strong className="text-zinc-200">{detectedCard.language}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
