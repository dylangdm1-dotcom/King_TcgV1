"use client";

export const dynamic = "force-dynamic";

import { useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  Sparkles,
  Layers,
  Trash2,
  Download,
  ExternalLink,
  Zap,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
  Camera,
  Languages,
  CheckCircle2,
  Loader2,
  Grid2X2,
  Images,
} from "lucide-react";

import ScannerCamera, { type ScannerCameraHandle } from "@/components/scanner/ScannerCamera";
import ScannerOverlay from "@/components/scanner/ScannerOverlay";

import { captureFrame } from "@/lib/scanner/capture";
import { searchCardsForScan } from "@/lib/scanner/searchFromScan";

import Navbar from "@/components/Navbar";

import { logger } from "@/lib/cache/logger";
import {
  getCachedCardData,
  setCachedCardData,
} from "@/lib/pokemonCache";

import type { PokemonCard, CardScanResult } from "@/lib/types";
import { PremiumBadge, PremiumCard, PremiumSectionHeading } from "@/components/ui/PremiumPrimitives";

interface ConfidenceResult {
  global: number;
  name: number;
  number: number;
  set: number;
}

const SCAN_REQUEST_TIMEOUT_MS = 35_000;

async function requestScanAnalysis(imageBase64: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SCAN_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        response.status === 429
          ? "Quota Gemini temporairement atteint. Réessayez dans un instant."
          : payload?.error || "Analyse de la carte indisponible.";
      throw new Error(message);
    }
    return payload;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Analyse trop longue. Les photos sont conservées, réessayez.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}


export interface ScannedBatchItem {
  id: string;
  card: PokemonCard;
  scannedAt: Date;
  confidence: number;
}

export default function ScannerPage() {
  const cameraRef = useRef<ScannerCameraHandle>(null);
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState(
    "Appuyez sur Scanner pour capturer et identifier votre carte"
  );
  const [detectedCard, setDetectedCard] = useState<any>(null);
  const [scanData, setScanData] = useState<CardScanResult | null>(null);
  const [scanConfidence, setScanConfidence] = useState(0);
  const [needsRetry, setNeedsRetry] = useState(false);

  const [scanMode, setScanMode] = useState<"single" | "batch">("single");
  const [batchCaptureMode, setBatchCaptureMode] = useState<"individual" | "grouped">("individual");
  const [batchList, setBatchList] = useState<ScannedBatchItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
        } catch {}
      }
    },
    []
  );

  // =====================================================
  // RESET SCAN STATE V5
  // =====================================================

  const resetScanState = () => {
    setDetectedCard(null);
    setScanData(null);
    setScanConfidence(0);
    setNeedsRetry(false);
  };

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
      } else {
        const newBatchItems = cards.map((card) => ({
          id: `${card.id}_${Date.now()}_${Math.random()}`,
          card,
          scannedAt: new Date(),
          confidence: 0.95,
        }));

        setBatchList((prev) => [...newBatchItems, ...prev]);
        setIsDrawerOpen(true);
        setStatus(`${cards.length} carte(s) ajoutée(s) à la session batch.`);
      }
    },
    [scanMode, router]
  );

  // =====================================================
  // CONFIDENCE ENGINE V5
  // =====================================================

  function calculateConfidence(data: any): ConfidenceResult {
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
  // MAIN SCAN ENGINE V5
  // =====================================================

  async function scan() {
    if (!cameraRef.current || scanning) {
      return;
    }

    const video = cameraRef.current.getVideo();

    if (!video) {
      setStatus("Caméra non disponible.");
      logger.error("SCAN", "Vidéo caméra indisponible.");
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
        setStatus("Impossible de capturer l'image.");
        triggerHaptic([100, 50, 100]);
        return;
      }

      // =================================================
      // 2 - GEMINI VISION
      // =================================================

      setStatus("Analyse IA Gemini V5...");
      logger.gemini("Envoi image vers /api/scan");

      const resData = await requestScanAnalysis(image64);

      logger.gemini("Réponse Gemini V5", resData);

      if (!resData.success || !resData.data) {
        setStatus(resData.error || "Carte non reconnue.");
        triggerHaptic([100, 50, 100]);
        return;
      }

      const {
        cardName,
        pokemonName,
        cardNumber,
        setName,
        setSymbol,
        cardType,
        language,
        rarity,
        variant,
        isFullArt,
        isSecretRare,
        possibleNames,
        confidence,
      } = resData.data;

      if (!cardName && !pokemonName) {
        setStatus("Nom Pokémon illisible.");
        triggerHaptic([100, 50, 100]);
        return;
      }

      // =================================================
      // 3 - CREATION RESULTAT V5
      // =================================================

      const scanResult: CardScanResult = {
        cardName: cardName ?? pokemonName ?? "",
        pokemonName: pokemonName ?? cardName ?? "",
        cardNumber: cardNumber ?? null,
      
        setName: setName ?? null,
        setSymbol: setSymbol ?? null,
      
        cardType: cardType ?? "Unknown",
      
        language: language ?? "fr",
        rarity: rarity ?? null,
        variant: variant ?? null,
      
        isFullArt: Boolean(isFullArt),
        isSecretRare: Boolean(isSecretRare),
        possibleNames: Array.isArray(possibleNames) ? possibleNames : [],
      
        confidence: confidence ?? 0,
        needsSecondPass: false,
      };

      setScanData(scanResult);

      // =================================================
      // 4 - CONFIDENCE V5
      // =================================================

      const confidenceResult = calculateConfidence(scanResult);

      setScanConfidence(
        Math.max(
          scanResult.confidence,
          confidenceResult.global
        )
      );

      const retry = confidenceResult.global < 0.55;
      setNeedsRetry(retry);

      setDetectedCard({
        name: scanResult.cardName,
        number: scanResult.cardNumber ?? undefined,
        set: scanResult.setName ?? undefined,
        language: scanResult.language,
        confidence: Math.max(
          scanResult.confidence,
          confidenceResult.global
        ),
      });

      setStatus(
        `IA : ${scanResult.cardName} (${(scanResult.language ?? "FR").toUpperCase()})`
      );

      // =================================================
      // 5 - CACHE V5
      // =================================================

      const cacheKey = `scan_${scanResult.cardName}_${scanResult.cardNumber || "no_num"}_${scanResult.setName || "no_set"}_${scanResult.language ?? "fr"}`;

      let bestCard: PokemonCard | null =
        getCachedCardData<PokemonCard>(cacheKey) || null;

      if (bestCard) {
        logger.cache("Carte trouvée dans cache V5.", bestCard);
      } else {
        setStatus(`Recherche TCG ${(scanResult.language ?? "FR").toUpperCase()}...`);

        logger.api("Recherche Pokémon TCG V5", scanResult);

        const cards = await searchCardsForScan(scanResult);

        if (!cards || cards.length === 0) {
          setStatus("Carte détectée mais introuvable.");
          triggerHaptic([100, 50, 100]);
          return;
        }

        bestCard = cards[0];

        setCachedCardData(cacheKey, bestCard);

        if (bestCard.id) {
          setCachedCardData(`card_${bestCard.id}`, bestCard);
        }
      }

      if (!bestCard) {
        setStatus("Erreur récupération carte.");
        return;
      }

      const card = bestCard;

      triggerHaptic(60);

      setStatus(`Trouvé : ${card.name} (${card.number || "N/A"})`);

      // =================================================
      // 6 - RESULTAT FINAL
      // =================================================

      if (scanMode === "single") {
        logger.scan(`Scan V5 réussi ${card.id}`);

        setTimeout(() => {
          router.push(`/card/${card.id}`);
        }, 400);
      } else {
        const batchItem: ScannedBatchItem = {
          id: `${card.id}_${Date.now()}`,
          card,
          scannedAt: new Date(),
          confidence: scanConfidence,
        };

        setBatchList((prev) => [batchItem, ...prev]);
        setIsDrawerOpen(true);
        logger.scan("Carte ajoutée au batch V5.");
      }
    } catch (error: any) {
      logger.error("SCAN", "Erreur scan V5", error);
      setStatus(error?.message || "Erreur pendant le scan.");
      triggerHaptic([100, 50, 100]);
    } finally {
      setScanning(false);
    }
  }

  // =====================================================
  // BATCH ACTIONS V5
  // =====================================================

  const removeBatchItem = (id: string) => {
    setBatchList((prev) => prev.filter((item) => item.id !== id));
  };

  const clearBatch = () => {
    if (confirm("Voulez-vous réinitialiser toute la session de scan ?")) {
      setBatchList([]);
    }
  };

  const exportBatch = () => {
    const dataStr = JSON.stringify(batchList, null, 2);
    const blob = new Blob([dataStr], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `king_tcg_scan_batch_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    link.click();
    URL.revokeObjectURL(url);
  };

  // =====================================================
  // IDENTIFICATION IMAGE CAMERA QUAD SCAN
  // =====================================================

  const handleIdentifyCardByImage = async (
    imageBase64: string
  ): Promise<PokemonCard | null> => {
    try {
      const resData = await requestScanAnalysis(imageBase64);

      if (resData.success && resData.data) {
        const data = resData.data;
      
        const scanResult: CardScanResult = {
          cardName: data.cardName ?? data.pokemonName ?? "",
          pokemonName: data.pokemonName ?? data.cardName ?? "",
          cardNumber: data.cardNumber ?? null,
      
          setName: data.setName ?? null,
          setSymbol: data.setSymbol ?? null,
      
          cardType: data.cardType ?? "Unknown",
      
          language: data.language ?? "fr",
          rarity: data.rarity ?? null,
          variant: data.variant ?? null,
      
          isFullArt: Boolean(data.isFullArt),
          isSecretRare: Boolean(data.isSecretRare),
          possibleNames: Array.isArray(data.possibleNames) ? data.possibleNames : [],
      
          confidence: data.confidence ?? 0,
          needsSecondPass: false,
        };
      
        const cards = await searchCardsForScan(scanResult);
      
        return cards?.[0] || null;
      }
    } catch (e: any) {
      logger.error("SCAN", "Erreur identification image Batch", e);
      setStatus(e?.message || "Une carte du lot n'a pas pu être identifiée.");
    }

    return null;
  };

  const handlePrimaryScan = () => {
    if (scanMode === "batch" && batchCaptureMode === "grouped") {
      setStatus("Capture groupée : analyse des quatre zones…");
      void cameraRef.current?.openGroupedScanner();
      return;
    }

    void scan();
  };

  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
          {/* HEADER V5 */}
          <section className="kt-premium-panel rounded-[22px] p-5 text-center flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Vision IA
            </div>

            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">
                Scanner de Cartes
              </h1>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Identifiez une carte puis ouvrez sa fiche marché complète.
              </p>
            </div>

            {/* MODE SWITCH */}
            <div className="flex items-center gap-1.5 bg-black/45 p-1.5 rounded-2xl border border-white/[0.07] w-full max-w-xs mt-1 shadow-inner">
              <button
                onClick={() => setScanMode("single")}
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
                onClick={() => setScanMode("batch")}
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

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PremiumCard className="p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-cyan-400/[0.08] p-2 text-cyan-300">
                  <Camera className="h-4 w-4" />
                </div>
                <PremiumSectionHeading
                  eyebrow="Prise en main"
                  title={scanMode === "single" ? "Une carte, une fiche complète" : "Plusieurs cartes, une seule session"}
                  description={scanMode === "single"
                    ? "Cadrez une carte entière pour obtenir l’identification et ouvrir sa fiche marché."
                    : "Choisissez une capture individuelle ou une photo groupée de quatre cartes."}
                />
              </div>
            </PremiumCard>
            <PremiumCard className="p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-violet-400/[0.08] p-2 text-violet-300">
                  <Languages className="h-4 w-4" />
                </div>
                <PremiumSectionHeading
                  eyebrow="Reconnaissance"
                  title="FR / EN optimisées"
                  description="Les cartes japonaises et chinoises sont détectées ; leur correspondance base continue de progresser."
                />
              </div>
            </PremiumCard>
          </section>

          <AnimatePresence initial={false}>
            {scanMode === "batch" && (
              <motion.section
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <PremiumCard className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-300">Module Batch</p>
                      <h2 className="mt-1 truncate text-sm font-black text-white">Choisissez votre méthode de capture</h2>
                      <p className="mt-1 text-[10px] leading-4 text-zinc-400">Les résultats rejoignent la même session et peuvent ensuite être exportés.</p>
                    </div>
                    <div className="shrink-0 whitespace-nowrap"><PremiumBadge tone="violet">{batchList.length} carte(s)</PremiumBadge></div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBatchCaptureMode("individual");
                        setStatus("Batch individuel : cadrez une carte puis ajoutez-la à la session.");
                      }}
                      className={`rounded-[18px] border p-3 text-left transition-all active:scale-[0.98] ${
                        batchCaptureMode === "individual"
                          ? "border-cyan-400/35 bg-cyan-400/[0.08]"
                          : "border-white/[0.08] bg-[#1a212a] hover:border-white/[0.14]"
                      }`}
                    >
                      <Images className={`h-5 w-5 ${batchCaptureMode === "individual" ? "text-cyan-300" : "text-zinc-400"}`} />
                      <p className="mt-3 text-xs font-black text-white">Photos individuelles</p>
                      <p className="mt-1 text-[10px] leading-4 text-zinc-400">Ajoutez les cartes une par une pour une précision maximale.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBatchCaptureMode("grouped");
                        setStatus("Photo groupée : placez une carte dans chacune des quatre zones.");
                      }}
                      className={`rounded-[18px] border p-3 text-left transition-all active:scale-[0.98] ${
                        batchCaptureMode === "grouped"
                          ? "border-violet-400/35 bg-violet-400/[0.08]"
                          : "border-white/[0.08] bg-[#1a212a] hover:border-white/[0.14]"
                      }`}
                    >
                      <Grid2X2 className={`h-5 w-5 ${batchCaptureMode === "grouped" ? "text-violet-300" : "text-zinc-400"}`} />
                      <p className="mt-3 text-xs font-black text-white">Une photo · 4 cartes</p>
                      <p className="mt-1 text-[10px] leading-4 text-zinc-400">Placez quatre cartes séparées sur un fond uni et capturez-les ensemble.</p>
                    </button>
                  </div>

                  {batchCaptureMode === "grouped" && (
                    <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] px-3 py-2.5 text-[10px] leading-4 text-amber-100/80">
                      Évitez les reflets, gardez les quatre cartes entièrement visibles et ne les superposez pas.
                    </div>
                  )}
                </PremiumCard>
              </motion.section>
            )}
          </AnimatePresence>

          {/* CAMERA */}
          <div className="kt-scan-grid relative aspect-[9/16] overflow-hidden rounded-[24px] border border-cyan-400/15 bg-black shadow-[0_24px_70px_rgba(0,0,0,.55)]">
            <ScannerCamera
              ref={cameraRef}
              onReady={handleCameraReady}
              onCardsIdentified={handleCardsIdentified}
              identifyCardByImage={handleIdentifyCardByImage}
            />

            <ScannerOverlay
              scanning={scanning}
              hasResult={Boolean(detectedCard)}
              statusText={status}
              mode={scanMode === "batch" && batchCaptureMode === "grouped" ? "quad" : "single"}
            />
          </div>

          {/* BUTTON SCAN */}
          <button
            onClick={handlePrimaryScan}
            disabled={!ready || scanning}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-cyan-500 py-4 text-sm font-black uppercase tracking-widest text-[#031014] disabled:opacity-40 transition-all hover:brightness-110 active:scale-[0.985] shadow-[0_14px_35px_rgba(34,211,238,.18)] flex items-center justify-center gap-2"
          >
            {scanning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours...</>
            ) : scanMode === "single" ? (
              <>Scanner & Consulter</>
            ) : batchCaptureMode === "grouped" ? (
              <><Grid2X2 className="h-4 w-4" /> Capturer les 4 cartes</>
            ) : (
              <><Images className="h-4 w-4" /> Ajouter cette carte</>
            )}
          </button>

          {/* STATUS */}
          <div className="kt-premium-panel rounded-[18px] p-4 text-center">
            <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 block">
              État du système
            </span>
            <p className="mt-1 text-xs font-bold text-cyan-300">{status}</p>
            {scanning && (
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {["Photo", "Carte", "Match", "Prix"].map((step, index) => (
                  <div key={step} className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.06] px-1.5 py-2 text-[8px] font-black uppercase tracking-wide text-cyan-300 animate-pulse" style={{ animationDelay: `${index * 120}ms` }}>
                    {step}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* APERÇU CARTE DÉTECTÉE */}
          {detectedCard && (
            <div className="kt-premium-panel rounded-[18px] p-4 flex items-center justify-between animate-fadeIn">
              <div>
                <div className="text-xs font-black uppercase text-white">
                  {detectedCard.name}
                  {detectedCard.language
                    ? ` (${detectedCard.language.toUpperCase()})`
                    : ""}
                </div>

                <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5 font-medium">
                  {detectedCard.number && (
                    <span>N° : {detectedCard.number}</span>
                  )}
                  {detectedCard.set && (
                    <span>• {detectedCard.set}</span>
                  )}
                </div>
              </div>

              {detectedCard.confidence && (
                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 tabular-nums">
                  {Math.round(detectedCard.confidence * 100)}%
                </span>
              )}
            </div>
          )}

          {/* CONFIDENCE V5 */}
          {scanData && (
            <div className="kt-premium-panel rounded-[18px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black uppercase">
                    Validation IA V5
                  </span>
                </div>
                <span className="text-[10px] font-black text-cyan-400">
                  {Math.round(scanConfidence * 100)}%
                </span>
              </div>

              <div className="h-1.5 bg-black rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all"
                  style={{
                    width: `${Math.round(scanConfidence * 100)}%`,
                  }}
                />
              </div>

              {needsRetry && (
                <button
                  onClick={scan}
                  className="w-full rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 py-2 text-[10px] font-black uppercase flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Relancer analyse IA
                </button>
              )}
            </div>
          )}
        </div>

        {/* =====================================================
            DRAWER BATCH V5
        ===================================================== */}
        {scanMode === "batch" && (
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 bg-neutral-950 border-t border-zinc-800 transition-all duration-300 shadow-2xl ${
              isDrawerOpen ? "h-[65vh]" : "h-14"
            }`}
          >
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="w-full h-14 bg-neutral-900/90 border-b border-zinc-800 px-4 flex items-center justify-between text-xs font-black uppercase tracking-wider text-white"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Session de Scan ({batchList.length})</span>
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
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.08]">
                    <button
                      onClick={exportBatch}
                      className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exporter JSON
                    </button>

                    <button
                      onClick={clearBatch}
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
                    batchList.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between bg-neutral-900/60 border border-white/[0.08] rounded-xl p-2.5"
                      >
                        <div className="flex items-center gap-3">
                          {item.card.images?.small && (
                            <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0">
                              <Image
                                src={item.card.images.small}
                                alt={item.card.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-black uppercase text-white">
                              {item.card.name}
                            </h4>
                            <p className="text-[10px] text-zinc-400">
                              N° {item.card.number} • {item.card.set?.name}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => removeBatchItem(item.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
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
