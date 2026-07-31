// app/scanner/page.tsx
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
  ExternalLink,
  Zap,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import ScannerCamera from "@/components/scanner/ScannerCamera";
import ScannerOverlay from "@/components/scanner/ScannerOverlay";
import { captureFrame } from "@/lib/scanner/capture";
import { searchCardsFromScan } from "@/lib/pokemon";
import Navbar from "@/components/Navbar";
import { logger } from "@/lib/cache/logger";
import { getCachedCardData, setCachedCardData } from "@/lib/pokemonCache";
import type { PokemonCard } from "@/lib/types";

interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
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
  const [status, setStatus] = useState("Alignez la carte dans le cadre et lancez l'analyse IA V5");
  const [detectedCard, setDetectedCard] = useState<any>(null);
  const [scanMode, setScanMode] = useState<"single" | "batch">("single");
  const [batchList, setBatchList] = useState<ScannedBatchItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // vibration non disponible
      }
    }
  }, []);

  const handleCameraReady = useCallback(() => {
    setReady(true);
    logger.scan("Scanner IA King_TCG V5 : caméra prête.");
  }, []);

  const handleCardsIdentified = useCallback((cards: PokemonCard[]) => {
    if (!cards || cards.length === 0) return;

    if (scanMode === "single") {
      router.push(`/card/${cards[0].id}`);
    } else {
      const newBatchItems: ScannedBatchItem[] = cards.map((card) => ({
        id: `${card.id}_${Date.now()}_${Math.random()}`,
        card,
        scannedAt: new Date(),
        confidence: 0.95,
      }));

      setBatchList((prev) => [...newBatchItems, ...prev]);
      setIsDrawerOpen(true);
      setStatus(`${cards.length} carte(s) ajoutée(s) à la session V5.`);
    }
  }, [scanMode, router]);

  async function scan() {
    if (!cameraRef.current || scanning) return;

    const video = cameraRef.current.getVideo();
    if (!video) {
      setStatus("Caméra indisponible.");
      logger.error("SCAN", "Vidéo caméra introuvable.");
      triggerHaptic([100, 50, 100]);
      return;
    }

    setScanning(true);
    setDetectedCard(null);

    try {
      setStatus("Capture de la carte...");
      logger.scan("Capture image scanner V5.");

      const image64 = captureFrame(video);
      if (!image64) {
        setStatus("Impossible de capturer l'image.");
        triggerHaptic([100, 50, 100]);
        return;
      }

      setStatus("Analyse IA Gemini Vision V5...");
      logger.gemini("Envoi image vers moteur IA V5.");

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
        language,
        rarity,
        variant,
        confidence,
      } = resData.data;

      if (!cardName && !pokemonName) {
        setStatus("Nom Pokémon illisible.");
        triggerHaptic([100, 50, 100]);
        return;
      }

      const scanResult = {
        cardName: cardName ?? pokemonName ?? "",
        pokemonName: pokemonName ?? cardName ?? "",
        cardNumber: cardNumber ?? null,
        setName: setName ?? null,
        language: language ?? "fr",
        rarity: rarity ?? null,
        variant: variant ?? null,
        confidence: confidence ?? 0,
      };

      setDetectedCard({
        name: scanResult.cardName,
        number: scanResult.cardNumber ?? undefined,
        set: scanResult.setName ?? undefined,
        language: scanResult.language,
        confidence: scanResult.confidence,
      });

      setStatus(`IA V5 : ${scanResult.cardName}`);

      const cacheKey = `scan_${scanResult.cardName}_${scanResult.cardNumber || "no_num"}_${scanResult.setName || "no_set"}_${scanResult.language}`;
      let bestCard: PokemonCard | null = getCachedCardData<PokemonCard>(cacheKey) || null;

      if (bestCard) {
        logger.cache("Carte récupérée depuis le cache V5.", bestCard);
      } else {
        setStatus(`Recherche base TCG ${scanResult.language.toUpperCase()}...`);
        logger.api("Recherche carte via moteur V5", scanResult);

        const cards = await searchCardsFromScan(scanResult);

        if (!cards || cards.length === 0) {
          setStatus(`Carte détectée mais introuvable : ${scanResult.cardName}`);
          logger.warn("API", "Aucun résultat trouvé.");
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

      if (scanMode === "single") {
        logger.scan(`Scan V5 réussi : ${card.id}`);
        setTimeout(() => {
          router.push(`/card/${card.id}`);
        }, 400);
      } else {
        const batchItem: ScannedBatchItem = {
          id: `${card.id}_${Date.now()}`,
          card,
          scannedAt: new Date(),
          confidence: scanResult.confidence,
        };

        setBatchList((prev) => [batchItem, ...prev]);
        setIsDrawerOpen(true);
        logger.scan(`Carte ajoutée au Batch V5 : ${card.name}`);
      }
    } catch (error) {
      logger.error("SCAN", "Erreur scanner V5", error);
      setStatus("Erreur pendant l'analyse IA.");
      triggerHaptic([100, 50, 100]);
    } finally {
      setScanning(false);
    }
  }

  const removeBatchItem = (id: string) => {
    setBatchList((prev) => prev.filter((item) => item.id !== id));
  };

  const clearBatch = () => {
    if (confirm("Réinitialiser la session de scan ?")) {
      setBatchList([]);
    }
  };

  const exportBatch = () => {
    const dataStr = JSON.stringify(batchList, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `king_tcg_v5_scan_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleIdentifyCardByImage = async (imageBase64: string): Promise<PokemonCard | null> => {
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
        }),
      });

      const resData = await response.json();

      if (resData.success && resData.data) {
        const cards = await searchCardsFromScan(resData.data);
        return cards?.[0] || null;
      }
    } catch (e) {
      console.error("Erreur identification image V5", e);
    }

    return null;
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-950 text-white pb-32 selection:bg-cyan-500/20">
        <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
          {/* Header Scanner V5 */}
          <section className="rounded-2xl border border-zinc-900 bg-neutral-900/40 p-4 text-center shadow-xl flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              Gemini Vision V5.0
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">
                Scanner IA King_TCG
              </h1>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Reconnaissance avancée des cartes Pokémon par intelligence artificielle.
              </p>
            </div>

            {/* Sélecteur Mono / Batch */}
            <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-zinc-800/80 w-full max-w-xs mt-1">
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

          {/* Caméra */}
          <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-zinc-900 bg-black shadow-2xl">
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
            />
          </div>

          {/* Bouton scan */}
          <button
            onClick={scan}
            disabled={!ready || scanning}
            className="w-full rounded-xl bg-cyan-500 py-4 text-sm font-black uppercase tracking-widest text-black disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-cyan-500/15 flex items-center justify-center gap-2"
          >
            {scanning
              ? "Analyse IA V5 en cours..."
              : scanMode === "single"
              ? "Scanner & Consulter"
              : "Ajouter à la Session"}
          </button>

          {/* Console système */}
          <div className="rounded-xl border border-zinc-900 bg-neutral-900/40 p-3.5 text-center">
            <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 block">
              État du système V5
            </span>
            <p className="mt-1 text-xs font-bold text-cyan-400">
              {status}
            </p>
          </div>

          {/* Dernière carte détectée */}
          {detectedCard && (
            <div className="rounded-xl border border-zinc-800 bg-neutral-900/80 p-3.5 flex items-center justify-between animate-fadeIn">
              <div>
                <div className="text-xs font-black uppercase text-white">
                  {detectedCard.name}
                  {detectedCard.language ? ` (${detectedCard.language.toUpperCase()})` : ""}
                </div>
                <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5 font-medium">
                  {detectedCard.number && <span>N° {detectedCard.number}</span>}
                  {detectedCard.set && <span>• {detectedCard.set}</span>}
                </div>
              </div>
              {detectedCard.confidence && (
                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {Math.round(detectedCard.confidence * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Drawer Batch V5 */}
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
                Session Scan V5 ({batchList.length})
              </div>
              {isDrawerOpen ? (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>

            {isDrawerOpen && (
              <div className="p-4 h-[calc(65vh-3.5rem)] overflow-y-auto">
                <div className="flex justify-between mb-3">
                  <button
                    onClick={exportBatch}
                    className="text-[10px] font-black uppercase text-cyan-400 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Exporter
                  </button>
                  <button
                    onClick={clearBatch}
                    className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Vider
                  </button>
                </div>

                {batchList.map((item) => {
                  const imageUrl = item.card.images?.small || item.card.images?.large;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 mb-2 bg-neutral-900 border border-zinc-900 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        {imageUrl && (
                          <Image
                            src={imageUrl}
                            width={35}
                            height={50}
                            alt={item.card.name}
                            className="rounded"
                            unoptimized
                          />
                        )}
                        <div>
                          <p className="text-xs font-black">
                            {item.card.name}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            N° {item.card.number || "---"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => router.push(`/card/${item.card.id}`)}
                          className="p-2 text-cyan-400"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeBatchItem(item.id)}
                          className="p-2 text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
