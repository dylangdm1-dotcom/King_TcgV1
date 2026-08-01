"use client";

export const dynamic = "force-dynamic";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  Sparkles,
  Layers,
  Trash2,
  Download,
  Zap,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

import ScannerCamera from "@/components/scanner/ScannerCamera";
import ScannerOverlay from "@/components/scanner/ScannerOverlay";

import { captureFrame } from "@/lib/scanner/capture";
import { searchCardsFromScan } from "@/lib/pokemon";

import Navbar from "@/components/Navbar";

import { logger } from "@/lib/cache/logger";
import {
  getCachedCardData,
  setCachedCardData,
} from "@/lib/pokemonCache";

import type {
  PokemonCard,
  CardScanResult,
} from "@/lib/types";

// =====================================================
// CAMERA HANDLE
// =====================================================

interface ScannerCameraHandle {
  getVideo(): HTMLVideoElement | null;
}

// =====================================================
// CONFIDENCE
// =====================================================

interface ConfidenceResult {
  global: number;
  name: number;
  number: number;
  set: number;
}

// =====================================================
// BATCH ITEM
// =====================================================

export interface ScannedBatchItem {
  id: string;
  card: PokemonCard;
  scannedAt: Date;
  confidence: number;
}

// =====================================================
// SCANNER PAGE
// =====================================================

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
    language?: string | null;
    confidence: number;
  } | null>(null);

  const [scanData, setScanData] =
    useState<CardScanResult | null>(null);

  /**
   * Toujours stocké en 0 → 1 pour l'interface.
   */
  const [scanConfidence, setScanConfidence] = useState(0);

  const [needsRetry, setNeedsRetry] = useState(false);

  const [scanMode, setScanMode] =
    useState<"single" | "batch">("single");

  const [batchList, setBatchList] =
    useState<ScannedBatchItem[]>([]);

  const [isDrawerOpen, setIsDrawerOpen] =
    useState(false);

  // =====================================================
  // HAPTIC FEEDBACK
  // =====================================================

  const triggerHaptic = useCallback(
    (pattern: number | number[]) => {
      if (
        typeof window !== "undefined" &&
        "vibrate" in navigator
      ) {
        try {
          navigator.vibrate(pattern);
        } catch {
          // Haptic non disponible
        }
      }
    },
    []
  );

  // =====================================================
  // RESET SCAN STATE
  // =====================================================

  const resetScanState = useCallback(() => {
    setDetectedCard(null);
    setScanData(null);
    setScanConfidence(0);
    setNeedsRetry(false);
  }, []);

  // =====================================================
  // CAMERA READY
  // =====================================================

  const handleCameraReady = useCallback(() => {
    setReady(true);
    logger.scan("Scanner V5 : caméra prête.");
  }, []);

  // =====================================================
  // CAMERA INTERNAL IDENTIFICATION
  // =====================================================

  const handleCardsIdentified = useCallback(
    (cards: PokemonCard[]) => {
      if (!cards || cards.length === 0) {
        return;
      }

      if (scanMode === "single") {
        router.push(`/card/${cards[0].id}`);
        return;
      }

      const now = Date.now();

      const newBatchItems: ScannedBatchItem[] =
        cards.map((card, index) => ({
          id: `${card.id}_${now}_${index}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          card,
          scannedAt: new Date(),
          confidence: 0.95,
        }));

      setBatchList((prev) => [
        ...newBatchItems,
        ...prev,
      ]);

      setIsDrawerOpen(true);

      setStatus(
        `${cards.length} carte(s) ajoutée(s) à la session batch.`
      );
    },
    [scanMode, router]
  );

  // =====================================================
  // CONFIDENCE ENGINE
  // =====================================================

  function calculateConfidence(
    data: CardScanResult
  ): ConfidenceResult {
    let name = 0;
    let number = 0;
    let set = 0;

    if (data.cardName || data.pokemonName) {
      name = 0.85;
    }

    if (data.cardNumber) {
      number = 0.90;
    }

    if (data.setName) {
      set = 0.80;
    }

    return {
      name,
      number,
      set,
      global: (name + number + set) / 3,
    };
  }

  // =====================================================
  // NORMALIZE GEMINI CONFIDENCE
  // =====================================================

  function normalizeConfidence(
    value: unknown
  ): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return 0;
    }

    // Gemini retourne normalement 0 → 100.
    // L'UI travaille en 0 → 1.
    if (numeric > 1) {
      return Math.min(100, Math.max(0, numeric)) / 100;
    }

    return Math.min(1, Math.max(0, numeric));
  }

  // =====================================================
  // BUILD SCAN RESULT
  // =====================================================

  function buildScanResult(
    data: any
  ): CardScanResult {
    const confidence = normalizeConfidence(
      data?.confidence
    );

    const cardName =
      typeof data?.cardName === "string" &&
      data.cardName.trim()
        ? data.cardName.trim()
        : null;

    const pokemonName =
      typeof data?.pokemonName === "string" &&
      data.pokemonName.trim()
        ? data.pokemonName.trim()
        : null;

    const possibleNames = Array.isArray(
      data?.possibleNames
    )
      ? data.possibleNames.filter(
          (name: unknown): name is string =>
            typeof name === "string" &&
            name.trim().length > 0
        )
      : [];

    const cardType =
      data?.cardType === "Pokemon" ||
      data?.cardType === "Trainer" ||
      data?.cardType === "Energy" ||
      data?.cardType === "Unknown"
        ? data.cardType
        : null;

    const variant =
      data?.variant === "Normal" ||
      data?.variant === "Full Art" ||
      data?.variant === "Alt Art" ||
      data?.variant === "Rainbow" ||
      data?.variant === "Gold" ||
      data?.variant === "Shiny" ||
      data?.variant === "Unknown"
        ? data.variant
        : null;

    return {
      cardName,
      pokemonName,

      cardType,

      language:
        typeof data?.language === "string"
          ? data.language
          : null,

      cardNumber:
        typeof data?.cardNumber === "string"
          ? data.cardNumber
          : null,

      setName:
        typeof data?.setName === "string"
          ? data.setName
          : null,

      setSymbol:
        typeof data?.setSymbol === "string"
          ? data.setSymbol
          : null,

      rarity:
        typeof data?.rarity === "string"
          ? data.rarity
          : null,

      variant,

      isFullArt:
        typeof data?.isFullArt === "boolean"
          ? data.isFullArt
          : false,

      isSecretRare:
        typeof data?.isSecretRare === "boolean"
          ? data.isSecretRare
          : false,

      possibleNames,

      confidence,

      needsSecondPass:
        typeof data?.needsSecondPass === "boolean"
          ? data.needsSecondPass
          : confidence < 0.60,
    };
  }

  // =====================================================
  // MAIN SCAN ENGINE
  // =====================================================

  async function scan() {
    if (!cameraRef.current || scanning) {
      return;
    }

    const video =
      cameraRef.current.getVideo();

    if (!video) {
      setStatus("Caméra non disponible.");
      logger.error(
        "SCAN",
        "Vidéo caméra indisponible."
      );
      triggerHaptic([100, 50, 100]);
      return;
    }

    setScanning(true);
    resetScanState();

    try {
      // =================================================
      // 1 - CAPTURE IMAGE
      // =================================================

      setStatus("Capture de la carte...");
      logger.scan("Capture image V5.");

      const image64 = captureFrame(video);

      if (!image64) {
        setStatus(
          "Impossible de capturer l'image."
        );
        triggerHaptic([100, 50, 100]);
        return;
      }

      // =================================================
      // 2 - GEMINI VISION
      // =================================================

      setStatus("Analyse IA Gemini V5...");
      logger.gemini(
        "Envoi image vers /api/scan"
      );

      const response = await fetch(
        "/api/scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageBase64: image64,
          }),
        }
      );

      const resData = await response.json();

      logger.gemini(
        "Réponse Gemini V5",
        resData
      );

      if (
        !response.ok ||
        !resData.success ||
        !resData.data
      ) {
        setStatus(
          resData.error ||
            "Carte non reconnue."
        );

        triggerHaptic([100, 50, 100]);
        return;
      }

      // =================================================
      // 3 - NORMALISATION RESULTAT
      // =================================================

      const scanResult =
        buildScanResult(resData.data);

      if (
        !scanResult.cardName &&
        !scanResult.pokemonName
      ) {
        setStatus(
          "Nom Pokémon illisible."
        );
        triggerHaptic([100, 50, 100]);
        return;
      }

      setScanData(scanResult);

      // =================================================
      // 4 - CONFIDENCE
      // =================================================

      const confidenceResult =
        calculateConfidence(scanResult);

      const finalConfidence =
        Math.max(
          scanResult.confidence,
          confidenceResult.global
        );

      setScanConfidence(finalConfidence);

      const retry =
        scanResult.needsSecondPass ||
        finalConfidence < 0.55;

      setNeedsRetry(retry);

      setDetectedCard({
        name:
          scanResult.cardName ??
          scanResult.pokemonName ??
          "Carte inconnue",

        number:
          scanResult.cardNumber ??
          undefined,

        set:
          scanResult.setName ??
          undefined,

        language:
          scanResult.language,

        confidence:
          finalConfidence,
      });

      setStatus(
        `IA : ${
          scanResult.cardName ??
          scanResult.pokemonName
        } (${
          (
            scanResult.language ??
            "fr"
          ).toUpperCase()
        })`
      );

      // =================================================
      // 5 - CACHE
      // =================================================

      const cacheKey =
        `scan_${scanResult.cardName ?? "unknown"}_` +
        `${scanResult.cardNumber ?? "no_num"}_` +
        `${scanResult.setName ?? "no_set"}_` +
        `${scanResult.language ?? "fr"}`;

      let bestCard: PokemonCard | null =
        getCachedCardData<PokemonCard>(
          cacheKey
        ) || null;

      if (bestCard) {
        logger.cache(
          "Carte trouvée dans cache V5.",
          bestCard
        );
      } else {
        setStatus(
          `Recherche TCG ${
            (
              scanResult.language ??
              "FR"
            ).toUpperCase()
          }...`
        );

        logger.api(
          "Recherche Pokémon TCG V5",
          scanResult
        );

        const cards =
          await searchCardsFromScan(
            scanResult
          );

        if (
          !cards ||
          cards.length === 0
        ) {
          setStatus(
            "Carte détectée mais introuvable."
          );
          triggerHaptic([100, 50, 100]);
          return;
        }

        bestCard = cards[0];

        setCachedCardData(
          cacheKey,
          bestCard
        );

        if (bestCard.id) {
          setCachedCardData(
            `card_${bestCard.id}`,
            bestCard
          );
        }
      }

      if (!bestCard) {
        setStatus(
          "Erreur récupération carte."
        );
        return;
      }

      const card = bestCard;

      triggerHaptic(60);

      setStatus(
        `Trouvé : ${card.name} (${
          card.number || "N/A"
        })`
      );

      // =================================================
      // 6 - RESULTAT FINAL
      // =================================================

      if (scanMode === "single") {
        logger.scan(
          `Scan V5 réussi ${card.id}`
        );

        setTimeout(() => {
          router.push(
            `/card/${card.id}`
          );
        }, 400);

        return;
      }

      // Important :
      // on utilise finalConfidence directement
      // et non scanConfidence, car setState est asynchrone.

      const batchItem: ScannedBatchItem = {
        id: `${card.id}_${Date.now()}`,
        card,
        scannedAt: new Date(),
        confidence: finalConfidence,
      };

      setBatchList((prev) => [
        batchItem,
        ...prev,
      ]);

      setIsDrawerOpen(true);

      logger.scan(
        "Carte ajoutée au batch V5."
      );
    } catch (error) {
      logger.error(
        "SCAN",
        "Erreur scan V5",
        error
      );

      setStatus(
        "Erreur pendant le scan."
      );

      triggerHaptic([100, 50, 100]);
    } finally {
      setScanning(false);
    }
  }

  // =====================================================
  // BATCH ACTIONS
  // =====================================================

  const removeBatchItem = (
    id: string
  ) => {
    setBatchList((prev) =>
      prev.filter(
        (item) => item.id !== id
      )
    );
  };

  const clearBatch = () => {
    if (
      confirm(
        "Voulez-vous réinitialiser toute la session de scan ?"
      )
    ) {
      setBatchList([]);
      setStatus(
        "Session batch réinitialisée."
      );
    }
  };

  const exportBatch = () => {
    const dataStr = JSON.stringify(
      batchList,
      null,
      2
    );

    const blob = new Blob(
      [dataStr],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `king_tcg_scan_batch_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  // =====================================================
  // IDENTIFICATION IMAGE CAMERA QUAD SCAN
  // =====================================================

  const handleIdentifyCardByImage =
    async (
      imageBase64: string
    ): Promise<PokemonCard | null> => {
      try {
        const response =
          await fetch("/api/scan", {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              imageBase64,
            }),
          });

        const resData =
          await response.json();

        if (
          !response.ok ||
          !resData.success ||
          !resData.data
        ) {
          return null;
        }

        const scanResult =
          buildScanResult(
            resData.data
          );

        if (
          !scanResult.cardName &&
          !scanResult.pokemonName
        ) {
          return null;
        }

        const cards =
          await searchCardsFromScan(
            scanResult
          );

        return cards?.[0] || null;
      } catch (error) {
        logger.error(
          "SCAN",
          "Erreur identification image",
          error
        );

        return null;
      }
    };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-xl space-y-4 px-4 py-5">

          {/* HEADER */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 text-center shadow-xl flex flex-col items-center gap-3">

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Gemini Vision V5.0
            </div>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">
                Scanner de Cartes
              </h1>

              <p className="text-[11px] text-zinc-400 mt-0.5">
                Reconnaissance IA avancée Pokémon TCG.
              </p>
            </div>

            {/* MODE SWITCH */}
            <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-zinc-800/80 w-full max-w-xs mt-1">

              <button
                onClick={() =>
                  setScanMode("single")
                }
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  scanMode === "single"
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Mono
              </button>

              <button
                onClick={() =>
                  setScanMode("batch")
                }
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  scanMode === "batch"
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Batch ({batchList.length})
              </button>

            </div>
          </section>

          {/* CAMERA */}
          <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-zinc-900 bg-black shadow-2xl">

            <ScannerCamera
              ref={cameraRef}
              onReady={handleCameraReady}
              onCardsIdentified={
                handleCardsIdentified
              }
              identifyCardByImage={
                handleIdentifyCardByImage
              }
            />

            <ScannerOverlay
              scanning={scanning}
              hasResult={
                Boolean(detectedCard)
              }
              statusText={status}
            />
          </div>

          {/* BUTTON SCAN */}
          <button
            onClick={scan}
            disabled={
              !ready || scanning
            }
            className="w-full rounded-xl bg-cyan-500 py-4 text-sm font-black uppercase tracking-widest text-black disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-cyan-500/15 flex items-center justify-center gap-2"
          >
            {scanning ? (
              <>Analyse IA V5...</>
            ) : scanMode === "single" ? (
              <>Scanner & Consulter</>
            ) : (
              <>Ajouter à la Session (+1)</>
            )}
          </button>

          {/* STATUS */}
          <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-3.5 text-center">

            <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 block">
              État du système
            </span>

            <p className="mt-1 text-xs font-bold text-cyan-400">
              {status}
            </p>

          </div>

          {/* DETECTED CARD */}
          {detectedCard && (
            <div className="rounded-xl border border-zinc-800 bg-neutral-900/80 p-3.5 flex items-center justify-between animate-fadeIn">

              <div>
                <div className="text-xs font-black uppercase text-white">
                  {detectedCard.name}

                  {detectedCard.language
                    ? ` (${detectedCard.language.toUpperCase()})`
                    : ""}
                </div>

                <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5 font-medium">

                  {detectedCard.number && (
                    <span>
                      N° :{" "}
                      {detectedCard.number}
                    </span>
                  )}

                  {detectedCard.set && (
                    <span>
                      • {detectedCard.set}
                    </span>
                  )}

                </div>
              </div>

              <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 tabular-nums">
                {Math.round(
                  detectedCard.confidence *
                    100
                )}
                %
              </span>

            </div>
          )}

          {/* CONFIDENCE */}
          {scanData && (
            <div className="rounded-xl border border-zinc-800 bg-neutral-900/80 p-3.5 space-y-3">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />

                  <span className="text-xs font-black uppercase">
                    Validation IA V5
                  </span>
                </div>

                <span className="text-[10px] font-black text-cyan-400">
                  {Math.round(
                    scanConfidence * 100
                  )}
                  %
                </span>

              </div>

              <div className="h-1.5 bg-black rounded-full overflow-hidden">

                <div
                  className="h-full bg-cyan-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        scanConfidence *
                          100
                      )
                    )}%`,
                  }}
                />

              </div>

              {needsRetry && (
                <button
                  onClick={scan}
                  disabled={scanning}
                  className="w-full rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 py-2 text-[10px] font-black uppercase flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <RefreshCw className="w-3 h-3" />
                  Relancer analyse IA
                </button>
              )}

            </div>
          )}

        </div>

        {/* =================================================
            BATCH DRAWER
        ================================================= */}

        {scanMode === "batch" && (
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 bg-neutral-950 border-t border-zinc-800 transition-all duration-300 shadow-2xl ${
              isDrawerOpen
                ? "h-[65vh]"
                : "h-14"
            }`}
          >

            <button
              onClick={() =>
                setIsDrawerOpen(
                  !isDrawerOpen
                )
              }
              className="w-full h-14 bg-neutral-900/90 border-b border-zinc-800 px-4 flex items-center justify-between text-xs font-black uppercase tracking-wider text-white"
            >

              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />

                <span>
                  Session de Scan (
                  {batchList.length}
                  )
                </span>
              </div>

              {isDrawerOpen ? (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}

            </button>

            {isDrawerOpen && (
              <div className="p-4 h-[calc(65vh-3.5rem)] flex flex-col justify-between overflow-hidden">

                {batchList.length > 0 && (
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-900">

                    <button
                      onClick={
                        exportBatch
                      }
                      className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exporter JSON
                    </button>

                    <button
                      onClick={
                        clearBatch
                      }
                      className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Vider
                    </button>

                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">

                  {batchList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-2">

                      <Layers className="w-8 h-8 opacity-40" />

                      <p className="text-xs uppercase font-bold">
                        Aucune carte scannée
                      </p>

                    </div>
                  ) : (
                    batchList.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-neutral-900/60 border border-zinc-900 rounded-xl p-2.5"
                        >

                          <div className="flex items-center gap-3">

                            {item.card.images
                              ?.small && (
                              <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">

                                <Image
                                  src={
                                    item.card
                                      .images
                                      .small
                                  }
                                  alt={
                                    item.card
                                      .name
                                  }
                                  fill
                                  className="object-cover"
                                />

                              </div>
                            )}

                            <div>

                              <h4 className="text-xs font-black uppercase text-white">
                                {
                                  item.card
                                    .name
                                }
                              </h4>

                              <p className="text-[10px] text-zinc-400">
                                N°{" "}
                                {
                                  item.card
                                    .number
                                }{" "}
                                •{" "}
                                {
                                  item.card
                                    .set
                                    ?.name
                                }
                              </p>

                            </div>

                          </div>

                          <button
                            onClick={() =>
                              removeBatchItem(
                                item.id
                              )
                            }
                            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                            aria-label="Supprimer la carte"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      )
                    )
                  )}

                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </>
  );
}