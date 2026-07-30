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

import ScannerCamera from "../../components/scanner/ScannerCamera";
import ScannerOverlay from "../../components/scanner/ScannerOverlay";
import { captureFrame } from "../../lib/scanner/capture";
import { searchCardsFromScan } from "../../lib/pokemon";
import Navbar from "../../components/Navbar";

// 🚀 V3.6 Integrations
import { logger } from "@/lib/cache/logger";
import { getCachedCardData, setCachedCardData } from "@/lib/pokemonCache";
import type { PokemonCard } from "../../lib/types";

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
  const [status, setStatus] = useState(
    "Alignez la carte dans le cadre et appuyez sur Scanner"
  );
  const [detectedCard, setDetectedCard] = useState<any>(null);

  // 🎯 Nouveaux États : Mode de scan & Historique Batch
  const [scanMode, setScanMode] = useState<"single" | "batch">("single");
  const [batchList, setBatchList] = useState<ScannedBatchItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Utilitaire Haptique
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignorer si bloqué par le navigateur
      }
    }
  }, []);

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
      triggerHaptic([100, 50, 100]);
      return;
    }

    setScanning(true);
    setDetectedCard(null);

    try {
      /* 1 - Capture image */
      setStatus("Capture de la carte...");
      logger.scan("Début du processus de capture d'image.");
      const image64 = captureFrame(video);

      if (!image64) {
        setStatus("Impossible de capturer l'image.");
        logger.warn("SCAN", "Échec de capture d'image.");
        triggerHaptic([100, 50, 100]);
        return;
      }

      /* 2 - Analyse Gemini Vision */
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
        setStatus(resData.error || "Carte non reconnue.");
        logger.warn("GEMINI", "Reconnaissance échouée ou incomplète.");
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
        logger.warn("GEMINI", "Nom Pokémon introuvable dans la réponse.");
        triggerHaptic([100, 50, 100]);
        return;
      }

      const scanResult = {
        cardName: cardName ?? pokemonName ?? "",
        pokemonName: pokemonName ?? cardName ?? "",
        cardNumber: cardNumber ?? null,
        setName: setName ?? null,
        setSymbol: null,
        cardType: null,
        language: language ?? "fr",
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

      setStatus(`IA : ${scanResult.cardName} (${scanResult.language.toUpperCase()})`);

      /* 3 - Vérification du Cache local V3.6 */
      const cacheKey = `scan_${scanResult.cardName}_${scanResult.cardNumber || "no_num"}_${scanResult.setName || "no_set"}_${scanResult.language}`;
      let bestCard: PokemonCard | null = getCachedCardData<PokemonCard>(cacheKey) || null;

      if (bestCard) {
        logger.cache("Carte directement récupérée du cache V3.6 !", bestCard);
      } else {
        /* 4 - Recherche API Pokémon TCG ciblée sur la langue d'origine */
        setStatus(`Recherche TCG (${scanResult.language.toUpperCase()})...`);
        logger.api("Lancement de la recherche TCG multilingue", scanResult);

        const cards = await searchCardsFromScan(scanResult, scanResult.language);

        if (!cards || cards.length === 0) {
          setStatus(`Carte détectée (${scanResult.cardName}) mais introuvable.`);
          logger.warn("API", `Aucun résultat trouvé pour ${scanResult.cardName} en ${scanResult.language}`);
          triggerHaptic([100, 50, 100]);
          return;
        }

        bestCard = cards[0];

        // Mise en cache V3.6
        setCachedCardData(cacheKey, bestCard);
        if (bestCard.id) {
          setCachedCardData(`card_${bestCard.id}`, bestCard);
        }
      }

      // 🛡️ Garde de sécurité TypeScript stricte
      if (!bestCard) {
        setStatus("Erreur lors de la récupération de la carte.");
        triggerHaptic([100, 50, 100]);
        return;
      }

      // Constante locale non-null pour garantir le typage TypeScript dans les callbacks
      const card = bestCard;

      // 🎉 Succès de détection !
      triggerHaptic(60); // Vibration courte de confirmation
      setStatus(`Trouvé : ${card.name} (${card.number || "N/A"})`);

      // Traitement selon le mode sélectionné
      if (scanMode === "single") {
        logger.scan(`Scan unique réussi ! Redirection vers la carte ID: ${card.id}`);
        setTimeout(() => {
          router.push(`/card/${card.id}`);
        }, 400);
      } else {
        // Mode Batch : Ajout à la liste et ouverture automatique du drawer
        const batchItem: ScannedBatchItem = {
          id: `${card.id}_${Date.now()}`,
          card: card,
          scannedAt: new Date(),
          confidence: scanResult.confidence,
        };

        setBatchList((prev) => [batchItem, ...prev]);
        setIsDrawerOpen(true);
        logger.scan(`Carte ajoutée à la session Batch ! Total: ${batchList.length + 1}`);
      }

    } catch (error) {
      logger.error("SCAN", "Erreur inattendue pendant le scan", error);
      setStatus("Erreur pendant le scan.");
      triggerHaptic([100, 50, 100]);
    } finally {
      setScanning(false);
    }
  }

  // Suppression d'un item du Batch
  const removeBatchItem = (id: string) => {
    setBatchList((prev) => prev.filter((item) => item.id !== id));
  };

  // Vidage complet de la session
  const clearBatch = () => {
    if (confirm("Voulez-vous réinitialiser toute la session de scan ?")) {
      setBatchList([]);
    }
  };

  // Export de la session en JSON
  const exportBatch = () => {
    const dataStr = JSON.stringify(batchList, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `king_tcg_scan_batch_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white pb-32">
        <div className="mx-auto max-w-xl space-y-4 px-4 py-4">
          
          {/* Header & Selecteur de Mode */}
          <section className="rounded-xl border border-zinc-900 bg-neutral-950 p-3 text-center shadow-xl flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> Gemini Vision V3.6
            </div>
            
            <h1 className="text-base font-black uppercase tracking-wider">
              Scanner de Carte Pokémon
            </h1>

            {/* Commutateur Mono / Multi */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-zinc-800 w-full max-w-xs mt-1">
              <button
                onClick={() => setScanMode("single")}
                className={`flex-1 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                  scanMode === "single"
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3" /> Mono-scan
              </button>
              <button
                onClick={() => setScanMode("batch")}
                className={`flex-1 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                  scanMode === "batch"
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Layers className="w-3 h-3" /> Mode Batch ({batchList.length})
              </button>
            </div>
          </section>

          {/* Zone Vidéo & Scanner Camera */}
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950 shadow-2xl">
            <ScannerCamera ref={cameraRef} onReady={handleCameraReady} />
            <ScannerOverlay
              scanning={scanning}
              hasResult={Boolean(detectedCard)}
              statusText={status}
            />
          </div>

          {/* Bouton de déclenchement */}
          <button
            onClick={scan}
            disabled={!ready || scanning}
            className="w-full rounded-xl bg-cyan-500 py-4 text-base font-black uppercase tracking-widest text-black disabled:opacity-40 transition active:scale-[0.98] shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
          >
            {scanning ? (
              <>Analyse IA en cours...</>
            ) : scanMode === "single" ? (
              <>Scanner & Consulter</>
            ) : (
              <>Ajouter à la Session (+1)</>
            )}
          </button>

          {/* Console de Statut */}
          <div className="rounded-xl border border-zinc-900 bg-neutral-950/60 p-3 text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block">
              Statut du Scan
            </span>
            <p className="mt-1 text-xs font-bold text-cyan-400">
              {status}
            </p>
          </div>

          {/* Aperçu rapide de la dernière carte détectée */}
          {detectedCard && (
            <div className="rounded-xl border border-zinc-800 bg-neutral-900/80 p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase text-white">
                  {detectedCard.name} {detectedCard.language ? `(${detectedCard.language.toUpperCase()})` : ""}
                </div>
                <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                  {detectedCard.number && <span>N° : {detectedCard.number}</span>}
                  {detectedCard.set && <span>• {detectedCard.set}</span>}
                </div>
              </div>
              {detectedCard.confidence && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {Math.round(detectedCard.confidence * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* 🗂️ TIROIR / DRAWER EN MODE BATCH */}
        {scanMode === "batch" && (
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 bg-neutral-950 border-t border-zinc-800 transition-all duration-300 shadow-2xl ${
              isDrawerOpen ? "h-[65vh]" : "h-14"
            }`}
          >
            {/* Poignée d'ouverture / fermeture du Tiroir */}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="w-full h-14 bg-neutral-900/90 border-b border-zinc-800/80 px-4 flex items-center justify-between text-xs font-black uppercase tracking-wider text-white"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Session de Scan ({batchList.length})</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="text-[10px] font-normal">
                  {isDrawerOpen ? "Masquer" : "Dérouler"}
                </span>
                {isDrawerOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </div>
            </button>

            {/* Contenu du Tiroir */}
            {isDrawerOpen && (
              <div className="p-4 h-[calc(65vh-3.5rem)] flex flex-col justify-between overflow-hidden">
                {/* Entête d'actions Batch */}
                {batchList.length > 0 && (
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-900">
                    <button
                      onClick={exportBatch}
                      className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 px-2.5 py-1.5 rounded border border-cyan-500/20"
                    >
                      <Download className="w-3 h-3" /> Exporter (.json)
                    </button>
                    <button
                      onClick={clearBatch}
                      className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2.5 py-1.5 rounded border border-red-500/20"
                    >
                      <Trash2 className="w-3 h-3" /> Réinitialiser
                    </button>
                  </div>
                )}

                {/* Liste déroulante des cartes scannées */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {batchList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-600 space-y-2">
                      <Layers className="w-8 h-8 opacity-30" />
                      <p className="text-xs font-medium">
                        Aucune carte scannée dans cette session.
                      </p>
                    </div>
                  ) : (
                    batchList.map((item) => {
                      const imageUrl = item.card.images?.small || item.card.images?.large;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 bg-neutral-900/90 border border-zinc-800/80 rounded-lg hover:border-cyan-500/40 transition"
                        >
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <div className="relative w-9 h-12 rounded overflow-hidden border border-zinc-800 bg-black flex-shrink-0">
                                <Image
                                  src={imageUrl}
                                  alt={item.card.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-9 h-12 rounded border border-zinc-800 bg-neutral-800 flex items-center justify-center text-[9px] text-zinc-500 flex-shrink-0">
                                N/A
                              </div>
                            )}

                            <div>
                              <div className="text-xs font-black text-white line-clamp-1">
                                {item.card.name}
                              </div>
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                <span>N° {item.card.number || "---"}</span>
                                {item.card.rarity && (
                                  <>
                                    <span>•</span>
                                    <span className="text-cyan-400 font-bold">
                                      {item.card.rarity}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/card/${item.card.id}`)}
                              className="p-1.5 rounded text-zinc-400 hover:text-cyan-400 hover:bg-neutral-800 transition"
                              title="Voir la fiche complète"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeBatchItem(item.id)}
                              className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-neutral-800 transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
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
