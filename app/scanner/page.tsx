"use client";

export const dynamic = "force-dynamic";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import ScannerCamera from "../../components/scanner/ScannerCamera";
import ScannerOverlay from "../../components/scanner/ScannerOverlay";
import { captureFrame } from "../../lib/scanner/capture";
import { searchCardsFromScan } from "../../lib/pokemon";
import Navbar from "../../components/Navbar";

// 🚀 V3.6 Integrations
import { logger } from "@/lib/cache/logger";
import { getCachedCardData, setCachedCardData } from "@/lib/pokemonCache";

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
  const [detectedCard, setDetectedCard] = useState<any>(null);

  const handleCameraReady = useCallback(() => {
    setReady(true);
    logger.scan("Caméra prête pour l'acquisition.");
  }, []);

  async function scan() {
    if (!cameraRef.current || scanning) {
      return;
    }

    const video = cameraRef.current.getVideo();

    if (!video) {
      setStatus("Caméra non disponible.");
      logger.error("SCAN", "Erreur: vidéo non disponible.");
      return;
    }

    setScanning(true);
    setDetectedCard(null);

    try {
      /*
        1 - Capture image
      */
      setStatus("Capture de la carte...");
      logger.scan("Début du processus de capture d'image.");
      const image64 = captureFrame(video);

      if (!image64) {
        setStatus("Impossible de capturer l'image.");
        logger.warn("SCAN", "Échec de capture d'image.");
        return;
      }

      /*
        2 - Analyse Gemini Vision
      */
      setStatus("Analyse IA Gemini...");
      logger.gemini("Envoi de l'image à l'API Gemini /api/scan...");

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: image64,
        }),
      });

      const resData = await response.json();

      logger.gemini("Résultat de l'analyse Gemini", resData);

      if (!resData.success || !resData.data) {
        setStatus("Carte non reconnue.");
        logger.warn("GEMINI", "Reconnaissance échouée ou incomplète.");
        return;
      }

      const {
        cardName,
        pokemonName,
        cardNumber,
        setName,
        language,
        rarity,
        variant,
        confidence,
      } = resData.data;

      if (!cardName && !pokemonName) {
        setStatus("Nom Pokémon illisible.");
        logger.warn("GEMINI", "Nom Pokémon introuvable dans la réponse.");
        return;
      }

      const scanResult = {
        cardName: cardName ?? pokemonName ?? "",
        pokemonName: pokemonName ?? cardName ?? "",
        cardNumber: cardNumber ?? null,
        setName: setName ?? null,
        setSymbol: null,
        cardType: null,
        language: language ?? null,
        rarity: rarity ?? null,
        variant: variant ?? null,
        isFullArt: false,
        isSecretRare: false,
        confidence: confidence ?? 0,
        needsSecondPass: false,
      };

      setDetectedCard({
        name: scanResult.cardName,
        number: scanResult.cardNumber ?? undefined,
        set: scanResult.setName ?? undefined,
        language: scanResult.language ?? undefined,
        confidence: scanResult.confidence,
      });

      setStatus(`IA : ${scanResult.cardName}`);

      /*
        3 - Vérification du Cache local V3.6
      */
      const cacheKey = `scan_${scanResult.cardName}_${scanResult.cardNumber || "no_num"}_${scanResult.setName || "no_set"}`;
      const cachedCard = getCachedCardData<any>(cacheKey);

      if (cachedCard) {
        logger.cache("Carte directement récupérée du cache V3.6 !", cachedCard);
        setStatus(`Trouvé (Cache) : ${cachedCard.name} (${cachedCard.number})`);
        
        setTimeout(() => {
          router.push(`/card/${cachedCard.id}`);
        }, 300);
        return;
      }

      /*
        4 - Recherche API Pokémon TCG
      */
      setStatus("Recherche dans la base TCG...");
      logger.api("Lancement de la recherche TCG à partir du résultat Gemini", scanResult);

      const cards = await searchCardsFromScan(scanResult);

      if (!cards || cards.length === 0) {
        setStatus(
          `Carte détectée (${scanResult.cardName}) mais introuvable.`
        );
        logger.warn("API", `Aucun résultat trouvé pour ${scanResult.cardName}`);
        return;
      }

      const best = cards[0];

      // Mise en cache V3.6 de la carte sélectionnée pour les futures requêtes instantanées
      setCachedCardData(cacheKey, best);
      if (best.id) {
        setCachedCardData(`card_${best.id}`, best);
      }

      setStatus(`Trouvé : ${best.name} (${best.number})`);
      logger.scan(`Scan réussi ! Redirection vers la carte ID: ${best.id}`);

      setTimeout(() => {
        router.push(`/card/${best.id}`);
      }, 500);

    } catch (error) {
      logger.error("SCAN", "Erreur inattendue pendant le scan", error);
      setStatus("Erreur pendant le scan.");
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
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-500">
              Gemini Vision V3.6
            </span>

            <h1 className="mt-1 text-lg font-black uppercase">
              King_TCG Scanner IA
            </h1>
          </section>

          {/* Zone de la vidéo et du scanner overlay */}
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950">
            <ScannerCamera
              ref={cameraRef}
              onReady={handleCameraReady}
            />
            {/* Overlay visuel avec transmission du statut et de la réussite */}
            <ScannerOverlay 
              scanning={scanning} 
              hasResult={Boolean(detectedCard)} 
              statusText={status}
            />
          </div>

          <button
            onClick={scan}
            disabled={!ready || scanning}
            className="w-full rounded-xl bg-cyan-500 py-4 text-lg font-bold text-black disabled:opacity-40"
          >
            {scanning ? "Analyse IA..." : "Scanner la carte"}
          </button>

          <div className="rounded-xl border border-zinc-900 bg-neutral-950/40 p-4">
            <span className="text-xs uppercase tracking-widest text-zinc-500">
              Statut
            </span>

            <p className="mt-2 text-center text-sm font-semibold text-cyan-400">
              {status}
            </p>
          </div>

          {detectedCard && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="text-base font-bold">
                {detectedCard.name}
              </div>

              {detectedCard.number && (
                <div className="text-xs text-zinc-400">
                  N° : {detectedCard.number}
                </div>
              )}

              {detectedCard.set && (
                <div className="text-xs text-zinc-400">
                  Extension : {detectedCard.set}
                </div>
              )}

              {detectedCard.language && (
                <div className="text-xs text-zinc-400">
                  Langue : {detectedCard.language}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
