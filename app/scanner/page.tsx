"use client";

export const dynamic = "force-dynamic";

import { useRef, useState, useCallback, useEffect } from "react";
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
  Crown,
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

const SCANNER_MONTHLY_LIMIT = 50;
const SCANNER_BATCH_LIMIT = 4;
const SCANNER_QUOTA_KEY = "king_tcg_scanner_quota_v1";
const SCANNER_BATCH_KEY = "king_tcg_scanner_batch_v1";
const SCANNER_BATCH_QUOTA_KEY = "king_tcg_scanner_batch_quota_v1";

function getScannerPeriod(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = now.getDate() >= 5 ? new Date(year, month, 5) : new Date(year, month - 1, 5);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 5);
  return { start: start.toISOString(), end: end.toISOString() };
}

function readQuota() {
  const period = getScannerPeriod();
  if (typeof window === "undefined") return { used: 0, ...period };
  try {
    const raw = window.localStorage.getItem(SCANNER_QUOTA_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.start !== period.start || parsed.end !== period.end) {
      const fresh = { used: 0, ...period };
      window.localStorage.setItem(SCANNER_QUOTA_KEY, JSON.stringify(fresh));
      window.localStorage.removeItem(SCANNER_BATCH_QUOTA_KEY);
      return fresh;
    }
    return { used: Math.max(0, Number(parsed.used) || 0), ...period };
  } catch {
    return { used: 0, ...period };
  }
}

function writeQuota(used: number) {
  const next = { ...getScannerPeriod(), used: Math.max(0, Math.min(SCANNER_MONTHLY_LIMIT, used)) };
  try { window.localStorage.setItem(SCANNER_QUOTA_KEY, JSON.stringify(next)); } catch {}
  return next;
}

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
  const [premiumModesOpen, setPremiumModesOpen] = useState(false);
  const [batchCaptureMode, setBatchCaptureMode] = useState<"individual" | "grouped">("individual");
  const [groupedLanguage, setGroupedLanguage] = useState<"fr" | "en" | "ja" | "zh-tw">("fr");
  const [batchList, setBatchList] = useState<ScannedBatchItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaEnd, setQuotaEnd] = useState("");
  const [batchQuotaConsumed, setBatchQuotaConsumed] = useState(false);

  useEffect(() => {
    const quota = readQuota();
    setQuotaUsed(quota.used);
    setQuotaEnd(quota.end);
    try {
      const raw = window.localStorage.getItem(SCANNER_BATCH_KEY);
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          setBatchList(items.slice(0, SCANNER_BATCH_LIMIT).map((item: any) => ({
            ...item,
            scannedAt: new Date(item.scannedAt),
          })));
        }
      }
      setBatchQuotaConsumed(window.localStorage.getItem(SCANNER_BATCH_QUOTA_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SCANNER_BATCH_KEY,
        JSON.stringify(batchList.map((item) => ({ ...item, scannedAt: item.scannedAt.toISOString() })))
      );
    } catch {}
  }, [batchList]);

  const quotaBlocked = quotaUsed >= SCANNER_MONTHLY_LIMIT;

  const consumeSuccessfulSession = useCallback((mode: "single" | "batch") => {
    if (mode === "batch" && batchQuotaConsumed) return true;
    const current = readQuota();
    if (current.used >= SCANNER_MONTHLY_LIMIT) {
      setQuotaUsed(current.used);
      setQuotaEnd(current.end);
      return false;
    }
    const next = writeQuota(current.used + 1);
    setQuotaUsed(next.used);
    setQuotaEnd(next.end);
    if (mode === "batch") {
      setBatchQuotaConsumed(true);
      try { window.localStorage.setItem(SCANNER_BATCH_QUOTA_KEY, "1"); } catch {}
    }
    return true;
  }, [batchQuotaConsumed]);

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

  const handleQuadCardIdentified = useCallback((card: PokemonCard, slot: number) => {
    setBatchList((prev) => {
      if (prev.length >= SCANNER_BATCH_LIMIT) return prev;
      if (prev.some((item) => item.card.id === card.id)) return prev;

      const item: ScannedBatchItem = {
        id: `${card.id}_${Date.now()}_${slot}`,
        card,
        scannedAt: new Date(),
        confidence: 0.95,
      };
      return [item, ...prev].slice(0, SCANNER_BATCH_LIMIT);
    });
    setIsDrawerOpen(true);
    setStatus(`Quad : carte ${slot + 1} identifiée — ${card.name}`);
  }, []);

  const handleCardsIdentified = useCallback(
    (cards: PokemonCard[]) => {
      if (!cards || cards.length === 0) {
        setStatus("Quad terminé : aucune carte suffisamment sûre n'a été reliée.");
        return;
      }

      // ScannerCamera n'utilise ce callback final que pour le Quad.
      // Les cartes sont déjà ajoutées une par une via handleQuadCardIdentified.
      if (scanMode === "batch") {
        if (!consumeSuccessfulSession("batch")) {
          setStatus("Quota gratuit atteint. Renouvellement le 5 du mois.");
          return;
        }
        setIsDrawerOpen(true);
        setStatus(`Quad terminé : ${cards.length} carte(s) reconnue(s).`);
        triggerHaptic(60);
        return;
      }

      // Sécurité si le composant est un jour réutilisé en Mono.
      if (!consumeSuccessfulSession("single")) {
        setStatus("Quota gratuit atteint. Renouvellement le 5 du mois.");
        return;
      }
      router.push(`/card/${cards[0].id}`);
    },
    [scanMode, router, consumeSuccessfulSession, triggerHaptic]
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

    const currentQuota = readQuota();
    if (currentQuota.used >= SCANNER_MONTHLY_LIMIT) {
      setQuotaUsed(currentQuota.used);
      setQuotaEnd(currentQuota.end);
      setStatus(`Quota gratuit atteint (${SCANNER_MONTHLY_LIMIT}/${SCANNER_MONTHLY_LIMIT}). Renouvellement le ${new Date(currentQuota.end).toLocaleDateString("fr-FR")}.`);
      return;
    }
    if (scanMode === "batch" && batchList.length >= SCANNER_BATCH_LIMIT) {
      setStatus("Session batch pleine (4/4). Videz la session pour recommencer.");
      setIsDrawerOpen(true);
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

      const fallbackName =
        cardName ||
        pokemonName ||
        (Array.isArray(possibleNames) ? possibleNames[0] : null) ||
        "";

      const canMatchByIdentity = Boolean(
        cardNumber && (setName || setSymbol)
      );

      if (!fallbackName && !canMatchByIdentity) {
        setStatus("Nom, numéro et extension insuffisamment lisibles.");
        triggerHaptic([100, 50, 100]);
        return;
      }

      // =================================================
      // 3 - CREATION RESULTAT V5
      // =================================================

      const scanResult: CardScanResult = {
        cardName: fallbackName,
        pokemonName: pokemonName ?? cardName ?? fallbackName,
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

      const detectedLabel =
        scanResult.cardName ||
        (scanResult.cardNumber
          ? `Carte n° ${scanResult.cardNumber}`
          : "Carte détectée");

      setStatus(
        `IA : ${detectedLabel} (${(scanResult.language ?? "FR").toUpperCase()})`
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
        if (!consumeSuccessfulSession("single")) {
          setStatus("Quota gratuit atteint. Renouvellement le 5 du mois.");
          return;
        }
        logger.scan(`Scan V5 réussi ${card.id}`);

        setTimeout(() => {
          router.push(`/card/${card.id}`);
        }, 400);
      } else {
        if (!consumeSuccessfulSession("batch")) {
          setStatus("Quota gratuit atteint. Renouvellement le 5 du mois.");
          return;
        }
        const batchItem: ScannedBatchItem = {
          id: `${card.id}_${Date.now()}`,
          card,
          scannedAt: new Date(),
          confidence: scanConfidence,
        };

        setBatchList((prev) => [batchItem, ...prev].slice(0, SCANNER_BATCH_LIMIT));
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
      setBatchQuotaConsumed(false);
      try {
        window.localStorage.removeItem(SCANNER_BATCH_KEY);
        window.localStorage.removeItem(SCANNER_BATCH_QUOTA_KEY);
      } catch {}
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
      // Le Quad garde exactement le moteur IA V88/V85.
      // Seule la résolution finale est alignée sur Mono/Batch pour éviter
      // qu'un simple nom renvoie vers une autre édition du même Pokémon.
      const resData = await requestScanAnalysis(imageBase64);

      if (!resData.success || !resData.data) return null;

      const data = resData.data;
      const fallbackName =
        data.cardName ||
        data.pokemonName ||
        (Array.isArray(data.possibleNames) ? data.possibleNames[0] : null) ||
        "";

      const scanResult: CardScanResult = {
        cardName: fallbackName,
        pokemonName: data.pokemonName ?? data.cardName ?? fallbackName,
        cardNumber: data.cardNumber ?? null,
        setName: data.setName ?? null,
        setSymbol: data.setSymbol ?? null,
        cardType: data.cardType ?? "Unknown",
        // Quad : catalogue imposé par la langue choisie pour les 4 cartes.
        language: groupedLanguage,
        rarity: data.rarity ?? null,
        variant: data.variant ?? null,
        isFullArt: Boolean(data.isFullArt),
        isSecretRare: Boolean(data.isSecretRare),
        possibleNames: Array.isArray(data.possibleNames) ? data.possibleNames : [],
        confidence: data.confidence ?? 0,
        needsSecondPass: false,
      };

      const cacheKey = `scan_${scanResult.cardName}_${scanResult.cardNumber || "no_num"}_${scanResult.setName || "no_set"}_${scanResult.language ?? "fr"}`;
      const cached = getCachedCardData<PokemonCard>(cacheKey) || null;
      if (cached) return cached;

      const cards = await searchCardsForScan(scanResult);
      if (!cards?.length) return null;

      const cleanNumber = (value?: string | null) =>
        String(value ?? "")
          .toLowerCase()
          .split("/")[0]
          .replace(/[^a-z0-9]/g, "")
          .replace(/^0+(?=\d)/, "");
      const cleanText = (value?: string | null) =>
        String(value ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
          .trim();

      const wantedNumber = cleanNumber(scanResult.cardNumber);
      const wantedSet = cleanText(scanResult.setName || scanResult.setSymbol);

      // Quand le Quad a réussi à lire un numéro et/ou une extension,
      // on préfère une concordance réellement confirmée à cards[0].
      const confirmed = cards.find((card) => {
        const numberOk = !wantedNumber || cleanNumber(card.number) === wantedNumber;
        const cardSetId = cleanText(card.set?.id);
        const cardSetName = cleanText(card.set?.name);
        const setOk =
          !wantedSet ||
          cardSetId === wantedSet ||
          cardSetName === wantedSet ||
          cardSetId.includes(wantedSet) ||
          cardSetName.includes(wantedSet) ||
          wantedSet.includes(cardSetId) ||
          wantedSet.includes(cardSetName);
        return numberOk && setOk;
      });

      const bestCard = confirmed || cards[0];
      if (!bestCard) return null;

      // Même cache que le Mono/Batch : le lien réutilise ensuite exactement
      // l'identité King_TCG résolue, et non un résultat Quad séparé.
      setCachedCardData(cacheKey, bestCard);
      if (bestCard.id) setCachedCardData(`card_${bestCard.id}`, bestCard);

      return bestCard;
    } catch (e: any) {
      logger.error("SCAN", "Erreur identification image Quad", e);
      setStatus(e?.message || "Une carte du lot n'a pas pu être identifiée.");
    }

    return null;
  };

  const handlePrimaryScan = async () => {
    const currentQuota = readQuota();
    if (currentQuota.used >= SCANNER_MONTHLY_LIMIT) {
      setQuotaUsed(currentQuota.used);
      setQuotaEnd(currentQuota.end);
      setStatus(`Quota gratuit atteint (${SCANNER_MONTHLY_LIMIT}/${SCANNER_MONTHLY_LIMIT}). Renouvellement le ${new Date(currentQuota.end).toLocaleDateString("fr-FR")}.`);
      return;
    }
    if (scanMode === "batch" && batchList.length >= SCANNER_BATCH_LIMIT) {
      setStatus("Session batch pleine (4/4). Videz la session pour recommencer.");
      setIsDrawerOpen(true);
      return;
    }
    if (scanMode === "batch" && batchCaptureMode === "grouped") {
      if (!cameraRef.current || scanning) return;
      const label = groupedLanguage === "fr" ? "FR" : groupedLanguage === "en" ? "EN" : groupedLanguage === "ja" ? "JP" : "CN";
      setScanning(true);
      resetScanState();
      setStatus(`Quad ${label} : analyse progressive des quatre cartes…`);
      try {
        await cameraRef.current.openGroupedScanner();
      } catch (error: any) {
        logger.error("SCAN", "Erreur Quad", error);
        setStatus(error?.message || "Erreur pendant le Quad Scan.");
      } finally {
        setScanning(false);
      }
      return;
    }

    void scan();
  };

  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen pb-32 text-white selection:bg-cyan-500/20">
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6">

          {/* HERO */}
          <section className="relative overflow-hidden rounded-[22px] border border-cyan-400/25 bg-[#0a1118] p-5 shadow-[0_20px_52px_rgba(0,0,0,.27),0_0_34px_rgba(34,211,238,.045)] sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/[0.055] blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-36 bg-cyan-300/55 shadow-[0_0_12px_rgba(34,211,238,.7)]" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-cyan-400/25 bg-cyan-400/[0.075] text-cyan-300 shadow-[0_0_26px_rgba(34,211,238,.07)]">
                  <Camera className="h-7 w-7" />
                </span>
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">
                    <Sparkles className="h-3 w-3" />
                    Vision IA
                  </div>
                  <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-[28px]">
                    Scanner
                  </h1>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-300">
                    Cadrez une carte, lancez l’analyse et ouvrez directement sa fiche King_TCG.
                  </p>
                </div>
              </div>

              <div className="flex min-w-[180px] items-center justify-between gap-3 rounded-[15px] border border-cyan-400/16 bg-cyan-400/[0.04] px-4 py-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-400">
                    Quota actuel
                  </p>
                  <p className="mt-1 text-sm font-black text-white">
                    {quotaUsed} / {SCANNER_MONTHLY_LIMIT}
                  </p>
                </div>
                <PremiumBadge tone={quotaBlocked ? "amber" : "cyan"}>
                  {Math.max(0, SCANNER_MONTHLY_LIMIT - quotaUsed)} restantes
                </PremiumBadge>
              </div>
            </div>
          </section>

          {/* MODES */}
          <section className="grid grid-cols-3 gap-2 rounded-[18px] border border-white/[0.08] bg-[#0a1118] p-2 shadow-[0_14px_34px_rgba(0,0,0,.18)]">
            <button
              type="button"
              onClick={() => {
                setScanMode("single");
                setStatus("Appuyez sur Scanner pour capturer et identifier votre carte");
              }}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] border px-2 py-3 transition ${
                scanMode === "single"
                  ? "border-cyan-300/45 bg-cyan-400/[0.10] text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,.055)]"
                  : "border-transparent bg-white/[0.015] text-zinc-300 hover:border-white/[0.08]"
              }`}
            >
              <Zap className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.10em]">Mono</span>
              <span className="hidden text-[8px] font-semibold text-zinc-500 sm:block">1 carte</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode("batch");
                setBatchCaptureMode("individual");
                setPremiumModesOpen(false);
                setStatus("Batch Premium : scannez jusqu’à 4 cartes à la suite.");
              }}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] border px-2 py-3 transition ${
                scanMode === "batch" && batchCaptureMode === "individual"
                  ? "border-amber-300/40 bg-amber-400/[0.08] text-amber-200 shadow-[0_0_20px_rgba(245,196,81,.045)]"
                  : "border-transparent bg-white/[0.015] text-zinc-300 hover:border-white/[0.08]"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.10em]">Batch</span>
              <span className="hidden text-[8px] font-semibold text-amber-300/70 sm:block">Premium · 4 cartes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode("batch");
                setBatchCaptureMode("grouped");
                setPremiumModesOpen(false);
                setStatus("Quadra Scan Premium : placez 4 cartes dans une seule photo.");
              }}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[14px] border px-2 py-3 transition ${
                scanMode === "batch" && batchCaptureMode === "grouped"
                  ? "border-violet-300/40 bg-violet-400/[0.09] text-violet-200 shadow-[0_0_20px_rgba(167,139,250,.05)]"
                  : "border-transparent bg-white/[0.015] text-zinc-300 hover:border-white/[0.08]"
              }`}
            >
              <Grid2X2 className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.10em]">Quadra</span>
              <span className="hidden text-[8px] font-semibold text-violet-300/70 sm:block">Premium · 1 photo</span>
            </button>
          </section>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* CAMERA / ACTION */}
            <section className="space-y-3">
              {scanMode === "batch" && batchCaptureMode === "grouped" && (
                <div className="rounded-[16px] border border-violet-400/18 bg-[#0a1118] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Languages className="h-4 w-4 shrink-0 text-violet-300" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-violet-300">
                          Langue du Quad
                        </p>
                        <p className="text-[9px] text-zinc-400">
                          Les 4 cartes doivent utiliser le même catalogue.
                        </p>
                      </div>
                    </div>

                    <div className="grid shrink-0 grid-cols-4 gap-1">
                      {[
                        ["fr", "FR"],
                        ["en", "EN"],
                        ["ja", "JP"],
                        ["zh-tw", "CN"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setGroupedLanguage(value as "fr" | "en" | "ja" | "zh-tw");
                            setStatus(`Quad ${label} : placez jusqu’à 4 cartes ${label} dans les zones.`);
                          }}
                          className={`rounded-lg border px-2 py-1.5 text-[9px] font-black transition ${
                            groupedLanguage === value
                              ? "border-violet-300/45 bg-violet-400/[0.12] text-violet-200"
                              : "border-white/[0.07] bg-white/[0.02] text-zinc-400"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative mx-auto aspect-[9/16] w-full max-w-xl overflow-hidden rounded-[24px] border border-cyan-400/22 bg-black shadow-[0_26px_70px_rgba(0,0,0,.58),0_0_30px_rgba(34,211,238,.035)]">
                <div className="pointer-events-none absolute inset-x-16 top-0 z-20 h-px bg-cyan-300/70 shadow-[0_0_14px_rgba(34,211,238,.85)]" />

                <ScannerCamera
                  ref={cameraRef}
                  onReady={handleCameraReady}
                  onCardsIdentified={handleCardsIdentified}
                  onCardIdentified={handleQuadCardIdentified}
                  identifyCardByImage={handleIdentifyCardByImage}
                />

                <ScannerOverlay
                  scanning={scanning}
                  hasResult={Boolean(detectedCard)}
                  statusText={status}
                  mode={scanMode === "batch" && batchCaptureMode === "grouped" ? "quad" : "single"}
                />
              </div>

              <button
                onClick={handlePrimaryScan}
                disabled={!ready || scanning}
                className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-cyan-300/35 bg-cyan-400 px-4 py-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#031014] shadow-[0_14px_35px_rgba(34,211,238,.18)] transition hover:bg-cyan-300 active:scale-[0.99] disabled:opacity-40"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : scanMode === "single" ? (
                  <>
                    <Camera className="h-4 w-4" />
                    Scanner & consulter
                  </>
                ) : batchCaptureMode === "grouped" ? (
                  <>
                    <Grid2X2 className="h-4 w-4" />
                    Capturer les 4 cartes
                  </>
                ) : (
                  <>
                    <Images className="h-4 w-4" />
                    Ajouter cette carte
                  </>
                )}
              </button>
            </section>

            {/* SIDE PANEL */}
            <aside className="space-y-3 lg:sticky lg:top-24">
              <section className="rounded-[18px] border border-cyan-400/14 bg-[#0a1118] p-4 shadow-[0_16px_38px_rgba(0,0,0,.20)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.13em] text-cyan-300">
                      État du système
                    </p>
                    <p className="mt-1 text-[11px] font-bold leading-5 text-white">
                      {status}
                    </p>
                  </div>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    scanning
                      ? "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300"
                      : detectedCard
                        ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300"
                        : "border-white/[0.08] bg-white/[0.025] text-zinc-400"
                  }`}>
                    {scanning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : detectedCard ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                  </span>
                </div>

                {scanning && (
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {["Photo", "Carte", "Match", "Prix"].map((step, index) => (
                      <div
                        key={step}
                        className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.05] px-1 py-2 text-center text-[8px] font-black uppercase tracking-[0.08em] text-cyan-300 animate-pulse"
                        style={{ animationDelay: `${index * 120}ms` }}
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[18px] border border-white/[0.09] bg-[#0a1118] p-4">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-cyan-300" />
                  <div>
                    <p className="text-[10px] font-black text-white">
                      {scanMode === "single"
                        ? "Mono · une carte"
                        : batchCaptureMode === "grouped"
                          ? "Quadra · quatre zones"
                          : "Batch · session multiple"}
                    </p>
                    <p className="mt-0.5 text-[9px] leading-4 text-zinc-400">
                      {scanMode === "single"
                        ? "Cadrez entièrement la carte avant de lancer l’analyse."
                        : batchCaptureMode === "grouped"
                          ? "Gardez les quatre cartes visibles, nettes et non superposées."
                          : "Ajoutez jusqu’à quatre cartes successivement dans la même session."}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[18px] border border-white/[0.09] bg-[#0a1118] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400">
                      Renouvellement quota
                    </p>
                    <p className="mt-1 text-[11px] font-black text-white">
                      {quotaEnd ? new Date(quotaEnd).toLocaleDateString("fr-FR") : "5 du mois"}
                    </p>
                  </div>
                  <Crown className="h-5 w-5 text-amber-300" />
                </div>
              </section>

              {detectedCard && (
                <section className="rounded-[18px] border border-emerald-400/18 bg-emerald-400/[0.035] p-4 animate-fadeIn">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">
                        Carte détectée
                      </p>
                      <p className="mt-1 truncate text-[13px] font-black text-white">
                        {detectedCard.name}
                      </p>
                      <p className="mt-1 truncate text-[9px] text-zinc-300">
                        {detectedCard.number ? `N° ${detectedCard.number}` : "Numéro non lu"}
                        {detectedCard.set ? ` · ${detectedCard.set}` : ""}
                      </p>
                    </div>

                    {detectedCard.confidence && (
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-black text-emerald-300">
                        {Math.round(detectedCard.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </section>
              )}

              {scanData && (
                <section className="rounded-[18px] border border-cyan-400/15 bg-[#0a1118] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-cyan-300" />
                      <span className="text-[10px] font-black uppercase tracking-[0.11em] text-white">
                        Confiance IA
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-cyan-300">
                      {Math.round(scanConfidence * 100)}%
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all"
                      style={{ width: `${Math.round(scanConfidence * 100)}%` }}
                    />
                  </div>

                  {needsRetry && (
                    <button
                      onClick={scan}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] py-2.5 text-[9px] font-black uppercase tracking-[0.10em] text-cyan-300"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Relancer l’analyse IA
                    </button>
                  )}
                </section>
              )}

              {scanMode === "batch" && (
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="flex w-full items-center justify-between rounded-[18px] border border-amber-400/18 bg-amber-400/[0.04] px-4 py-3 text-left transition hover:border-amber-300/35"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.07] text-amber-300">
                      <Layers className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[10px] font-black text-white">
                        Session Batch
                      </span>
                      <span className="mt-0.5 block text-[9px] text-zinc-400">
                        {batchList.length}/{SCANNER_BATCH_LIMIT} cartes
                      </span>
                    </span>
                  </span>
                  <ChevronUp className="h-4 w-4 text-amber-300" />
                </button>
              )}
            </aside>
          </div>
        </div>

        {/* DRAWER BATCH */}
        {scanMode === "batch" && (
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 border-t border-cyan-400/14 bg-[#080d13]/98 shadow-[0_-18px_48px_rgba(0,0,0,.48)] backdrop-blur-2xl transition-all duration-300 ${
              isDrawerOpen ? "h-[65vh]" : "h-14"
            }`}
          >
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="flex h-14 w-full items-center justify-between border-b border-white/[0.07] bg-[#0a1118]/95 px-4 text-[10px] font-black uppercase tracking-[0.10em] text-white"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-300" />
                <span>Session de scan ({batchList.length}/{SCANNER_BATCH_LIMIT})</span>
              </div>

              {isDrawerOpen ? (
                <ChevronDown className="h-4 w-4 text-cyan-300" />
              ) : (
                <ChevronUp className="h-4 w-4 text-cyan-300" />
              )}
            </button>

            {isDrawerOpen && (
              <div className="flex h-[calc(65vh-3.5rem)] flex-col justify-between overflow-hidden p-4">
                {batchList.length > 0 && (
                  <div className="mb-3 flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <button
                      onClick={exportBatch}
                      className="flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-300"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exporter JSON
                    </button>

                    <button
                      onClick={clearBatch}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.09em] text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Vider
                    </button>
                  </div>
                )}

                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {batchList.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center text-zinc-500">
                      <Layers className="h-8 w-8 opacity-50" />
                      <p className="text-[10px] font-black uppercase tracking-[0.10em]">
                        Aucune carte scannée
                      </p>
                    </div>
                  ) : (
                    batchList.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-[14px] border border-white/[0.08] bg-[#0a1118] p-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {item.card.images?.small && (
                            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-black">
                              <Image
                                src={item.card.images.small}
                                alt={item.card.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="truncate text-[11px] font-black text-white">
                              {item.card.name}
                            </h4>
                            <p className="mt-0.5 truncate text-[9px] text-zinc-400">
                              N° {item.card.number} · {item.card.set?.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => router.push(`/card/${item.card.id}`)}
                            className="p-2 text-cyan-300 transition hover:text-cyan-200"
                            aria-label="Ouvrir la fiche"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBatchItem(item.id)}
                            className="p-2 text-zinc-400 transition hover:text-rose-300"
                            aria-label="Supprimer de la session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
