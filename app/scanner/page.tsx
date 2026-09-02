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
  BadgeEuro,
  Zap,
  ShieldCheck,
  RefreshCw,
  Camera,
  Languages,
  CheckCircle2,
  Loader2,
  Grid2X2,
  Crown,
} from "lucide-react";

import ScannerCamera, {
  type QuadIdentificationResult,
  type QuadSlotProgress,
  type ScannerCameraHandle,
} from "@/components/scanner/ScannerCamera";
import ScannerOverlay from "@/components/scanner/ScannerOverlay";

import { captureFrame } from "@/lib/scanner/capture";
import { searchCardsForScan } from "@/lib/scanner/searchFromScan";
import {
  scanCardEvidenceV293,
  scanLanguageLabelV293,
  scannerCacheKeyV293,
} from "@/lib/scanner/catalogIdentity";
import type { QuadImageQuality, QuadSlotIndex } from "@/lib/scanner/quadScanner";

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
const SCANNER_QUAD_KEY = "king_tcg_scanner_quad_v1";
const SCANNER_BATCH_QUOTA_KEY = "king_tcg_scanner_batch_quota_v1";
const SCANNER_QUAD_QUOTA_KEY = "king_tcg_scanner_quad_quota_v1";

function scannerCardHref(cardId: string) {
  return `/card/${encodeURIComponent(cardId)}?source=scanner`;
}

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
  quadSlot?: QuadSlotIndex;
}

const EMPTY_QUAD_PROGRESS: QuadSlotProgress[] = [
  { slot: 0, label: "Haut - Gauche", status: "empty", attempts: 0, confidence: 0 },
  { slot: 1, label: "Haut - Droite", status: "empty", attempts: 0, confidence: 0 },
  { slot: 2, label: "Bas - Gauche", status: "empty", attempts: 0, confidence: 0 },
  { slot: 3, label: "Bas - Droite", status: "empty", attempts: 0, confidence: 0 },
];

export default function ScannerPage() {
  const cameraRef = useRef<ScannerCameraHandle>(null);
  const cameraSectionRef = useRef<HTMLDivElement>(null);
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
  const [modeSelected, setModeSelected] = useState(false);
  const [batchCaptureMode, setBatchCaptureMode] = useState<"individual" | "grouped">("individual");
  const [groupedLanguage, setGroupedLanguage] = useState<"fr" | "en" | "ja" | "zh-tw">("fr");
  const [batchList, setBatchList] = useState<ScannedBatchItem[]>([]);
  const [quadList, setQuadList] = useState<ScannedBatchItem[]>([]);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaEnd, setQuotaEnd] = useState("");
  const [batchQuotaConsumed, setBatchQuotaConsumed] = useState(false);
  const [quadQuotaConsumed, setQuadQuotaConsumed] = useState(false);
  const [quadProgress, setQuadProgress] = useState<QuadSlotProgress[]>(EMPTY_QUAD_PROGRESS);

  useEffect(() => {
    const quota = readQuota();
    setQuotaUsed(quota.used);
    setQuotaEnd(quota.end);
    try {
      const raw = window.localStorage.getItem(SCANNER_BATCH_KEY);
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          const restoredItems = items.slice(0, SCANNER_BATCH_LIMIT).map((item: any) => ({
            ...item,
            scannedAt: new Date(item.scannedAt),
          }));
          setBatchList(restoredItems);
        }
      }
      const rawQuad = window.localStorage.getItem(SCANNER_QUAD_KEY);
      if (rawQuad) {
        const items = JSON.parse(rawQuad);
        if (Array.isArray(items) && items.length > 0) {
          setQuadList(items.slice(0, SCANNER_BATCH_LIMIT).map((item: any) => ({
            ...item,
            scannedAt: new Date(item.scannedAt),
          })));
        }
      }
      setBatchQuotaConsumed(window.localStorage.getItem(SCANNER_BATCH_QUOTA_KEY) === "1");
      setQuadQuotaConsumed(window.localStorage.getItem(SCANNER_QUAD_QUOTA_KEY) === "1");
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

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SCANNER_QUAD_KEY,
        JSON.stringify(quadList.map((item) => ({ ...item, scannedAt: item.scannedAt.toISOString() })))
      );
    } catch {}
  }, [quadList]);

  const quotaBlocked = quotaUsed >= SCANNER_MONTHLY_LIMIT;

  const consumeSuccessfulSession = useCallback((mode: "single" | "batch" | "quad") => {
    if (mode === "batch" && batchQuotaConsumed) return true;
    if (mode === "quad" && quadQuotaConsumed) return true;
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
    } else if (mode === "quad") {
      setQuadQuotaConsumed(true);
      try { window.localStorage.setItem(SCANNER_QUAD_QUOTA_KEY, "1"); } catch {}
    }
    return true;
  }, [batchQuotaConsumed, quadQuotaConsumed]);

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

  const handleQuadCardIdentified = useCallback((card: PokemonCard, slot: number, confidence = 0) => {
    const quadSlot = slot as QuadSlotIndex;
    setQuadList((prev) => {
      const item: ScannedBatchItem = {
        id: `${card.id}_${Date.now()}_${slot}`,
        card,
        scannedAt: new Date(),
        confidence,
        quadSlot,
      };
      // Une position Quad correspond à une carte physique. Deux cartes
      // identiques restent donc autorisées, tandis qu'une reprise remplace
      // uniquement l'ancienne lecture de la même zone.
      return [item, ...prev.filter((existing) => existing.quadSlot !== quadSlot)]
        .slice(0, SCANNER_BATCH_LIMIT);
    });
    setStatus(`Quad : carte ${slot + 1} identifiée — ${card.name}`);
  }, []);

  const handleQuadProgress = useCallback((slots: QuadSlotProgress[]) => {
    setQuadProgress(slots);
    const confirmed = slots.filter((slot) => slot.status === "success").length;
    const review = slots.filter((slot) => slot.status === "review").length;
    const processing = slots.filter((slot) => slot.status === "processing").length;
    if (processing > 0) {
      setStatus(`Quad : ${confirmed}/4 confirmée(s) · ${processing} analyse(s) en cours…`);
    } else if (review > 0) {
      setStatus(`Quad : ${confirmed}/4 confirmée(s) · ${review} correspondance(s) à vérifier.`);
    }
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
        if (!consumeSuccessfulSession(batchCaptureMode === "grouped" ? "quad" : "batch")) {
          setStatus("Quota Scanner atteint. Renouvellement le 5 du mois.");
          return;
        }
            setStatus(`Quad terminé : ${cards.length} carte(s) reconnue(s).`);
        triggerHaptic(60);
        return;
      }

      // Sécurité si le composant est un jour réutilisé en Mono.
      if (!consumeSuccessfulSession("single")) {
        setStatus("Quota Scanner atteint. Renouvellement le 5 du mois.");
        return;
      }
      router.push(scannerCardHref(cards[0].id));
    },
    [scanMode, batchCaptureMode, router, consumeSuccessfulSession, triggerHaptic]
  );

  // =====================================================
  // CONFIDENCE ENGINE V5
  // =====================================================

  function normalizeConfidenceRatio(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed));
  }

  function calculateConfidence(data: CardScanResult): ConfidenceResult {
    let name = 0;
    let number = 0;
    let set = 0;

    if (data.cardName || data.pokemonName) {
      name = 0.55;
    }

    if (data.cardNumber) {
      number = 0.20;
    }

    if (data.setName || data.setSymbol) {
      set = 0.20;
    }

    return {
      name,
      number,
      set,
      // Maximum 95 % : ce score mesure la complétude des signaux lus, pas une
      // authentification de la carte ni une certitude de correspondance marché.
      global: Math.min(0.95, name + number + set),
    };
  }

  function combineScanConfidence(modelConfidence: unknown, evidenceConfidence: number) {
    const modelRatio = normalizeConfidenceRatio(modelConfidence);
    if (modelRatio <= 0) return Math.min(0.65, evidenceConfidence * 0.7);

    // La confiance finale ne peut dépasser la preuve d'identité disponible de
    // plus de cinq points, même si le modèle se déclare très sûr.
    return Math.max(
      0,
      Math.min(
        0.95,
        evidenceConfidence + 0.05,
        modelRatio * 0.75 + evidenceConfidence * 0.25
      )
    );
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
      setStatus(`Quota Scanner atteint (${SCANNER_MONTHLY_LIMIT}/${SCANNER_MONTHLY_LIMIT}). Renouvellement le ${new Date(currentQuota.end).toLocaleDateString("fr-FR")}.`);
      return;
    }
    if (scanMode === "batch" && batchList.length >= SCANNER_BATCH_LIMIT) {
      setStatus("Session batch pleine (4/4). Videz la session pour recommencer.");
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

      const image64 = captureFrame(
        video,
        scanMode === "batch" && batchCaptureMode === "individual"
          ? { maxWidth: 1600, jpegQuality: 0.90 }
          : {}
      );

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
        needsReview,
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
      
        confidence: normalizeConfidenceRatio(confidence),
        needsSecondPass: Boolean(needsReview),
      };

      setScanData(scanResult);

      // =================================================
      // 4 - CONFIDENCE V5
      // =================================================

      const confidenceResult = calculateConfidence(scanResult);
      const validatedConfidence = combineScanConfidence(
        scanResult.confidence,
        confidenceResult.global
      );

      setScanConfidence(validatedConfidence);

      const retry = scanResult.needsSecondPass || validatedConfidence < 0.65;
      setNeedsRetry(retry);

      setDetectedCard({
        name: scanResult.cardName,
        number: scanResult.cardNumber ?? undefined,
        set: scanResult.setName ?? undefined,
        language: scanResult.language,
        confidence: validatedConfidence,
      });

      const detectedLabel =
        scanResult.cardName ||
        (scanResult.cardNumber
          ? `Carte n° ${scanResult.cardNumber}`
          : "Carte détectée");

      setStatus(
        `IA : ${detectedLabel} (${scanLanguageLabelV293(scanResult.language)})`
      );

      // =================================================
      // 5 - CACHE V5
      // =================================================

      const cacheKey = scannerCacheKeyV293(scanResult);

      let bestCard: PokemonCard | null =
        getCachedCardData<PokemonCard>(cacheKey) || null;

      if (bestCard) {
        logger.cache("Carte trouvée dans cache V5.", bestCard);
      } else {
        setStatus(`Recherche TCG ${scanLanguageLabelV293(scanResult.language)}...`);

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
          setStatus("Quota Scanner atteint. Renouvellement le 5 du mois.");
          return;
        }
        logger.scan(`Scan V5 réussi ${card.id}`);

        setTimeout(() => {
          router.push(scannerCardHref(card.id));
        }, 400);
      } else {
        if (!consumeSuccessfulSession("batch")) {
          setStatus("Quota Scanner atteint. Renouvellement le 5 du mois.");
          return;
        }
        const batchItem: ScannedBatchItem = {
          id: `${card.id}_${Date.now()}`,
          card,
          scannedAt: new Date(),
          confidence: validatedConfidence,
        };

        setBatchList((prev) => [batchItem, ...prev].slice(0, SCANNER_BATCH_LIMIT));
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
    if (batchCaptureMode === "grouped") {
      setQuadList((prev) => prev.filter((item) => item.id !== id));
    } else {
      setBatchList((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const clearBatch = () => {
    if (confirm("Voulez-vous réinitialiser toute la session de scan ?")) {
      if (batchCaptureMode === "grouped") {
        setQuadList([]);
        setQuadQuotaConsumed(false);
        try { window.localStorage.removeItem(SCANNER_QUAD_QUOTA_KEY); } catch {}
      } else {
        setBatchList([]);
        setBatchQuotaConsumed(false);
        try { window.localStorage.removeItem(SCANNER_BATCH_QUOTA_KEY); } catch {}
      }
      try {
        if (batchCaptureMode === "grouped") {
          window.localStorage.removeItem(SCANNER_QUAD_KEY);
          window.localStorage.removeItem(SCANNER_QUAD_QUOTA_KEY);
          setQuadProgress(EMPTY_QUAD_PROGRESS.map((slot) => ({ ...slot })));
        } else {
          window.localStorage.removeItem(SCANNER_BATCH_KEY);
          window.localStorage.removeItem(SCANNER_BATCH_QUOTA_KEY);
        }
      } catch {}
    }
  };

  const exportBatch = () => {
    const dataStr = JSON.stringify(batchCaptureMode === "grouped" ? quadList : batchList, null, 2);
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
    imageBase64: string,
    context: { slot: QuadSlotIndex; attempt: 1 | 2; quality?: QuadImageQuality }
  ): Promise<QuadIdentificationResult> => {
    try {
      const resData = await requestScanAnalysis(imageBase64);

      if (!resData.success || !resData.data) {
        return {
          card: null,
          confidence: 0,
          requiresReview: true,
          message: resData?.error || "Lecture IA insuffisante",
        };
      }

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
        confidence: normalizeConfidenceRatio(data.confidence),
        needsSecondPass: Boolean(data.needsReview),
      };

      const cacheKey = scannerCacheKeyV293(scanResult);
      const cached = getCachedCardData<PokemonCard>(cacheKey) || null;
      const cards = cached ? [cached] : await searchCardsForScan(scanResult);
      if (!cards?.length) {
        return {
          card: null,
          confidence: 0,
          requiresReview: true,
          message: "Carte lue mais absente du catalogue ciblé",
        };
      }

      const modelConfidence = normalizeConfidenceRatio(scanResult.confidence);

      const ranked = cards.map((card) => {
        const evidence = scanCardEvidenceV293(card, scanResult);
        const confidence = Math.min(
          0.97,
          (evidence.numberExact ? 0.38 : evidence.numberCompatible ? 0.12 : 0) +
          (evidence.setExact ? 0.28 : evidence.setCompatible ? 0.16 : 0) +
          (evidence.nameExact ? 0.24 : evidence.nameCompatible ? 0.16 : 0) +
          modelConfidence * 0.07 +
          Math.min(1, Math.max(0, context.quality?.score ?? 0.5)) * 0.03
        );

        return {
          card,
          confidence: evidence.languageExact ? confidence : 0,
          ...evidence,
        };
      });
      ranked.sort((a, b) => b.confidence - a.confidence);
      const best = ranked[0];
      if (!best) {
        return { card: null, confidence: 0, requiresReview: true, message: "Aucune correspondance exploitable" };
      }

      const identityMismatch =
        !best.languageExact ||
        (best.numberRequested && !best.numberExact) ||
        (best.setRequested && !best.setCompatible);
      const weakIdentity = best.signalCount < 2;
      const requiresReview = Boolean(
        scanResult.needsSecondPass ||
        identityMismatch ||
        weakIdentity ||
        best.confidence < 0.72
      );

      if (!requiresReview) {
        // Une identité validée rejoint le cache partagé Mono/Recherche/Fiche.
        setCachedCardData(cacheKey, best.card);
        if (best.card.id) setCachedCardData(`card_${best.card.id}`, best.card);
      }

      return {
        card: best.card,
        confidence: best.confidence,
        requiresReview,
        message: requiresReview
          ? context.attempt === 1
            ? "Lecture probable : second passage en cours"
            : "Vérifiez le nom, le numéro et l'extension"
          : "Nom, numéro et extension concordants",
      };
    } catch (e: any) {
      logger.error("SCAN", "Erreur identification image Quad", e);
      setStatus(e?.message || "Une carte du lot n'a pas pu être identifiée.");
      return {
        card: null,
        confidence: 0,
        requiresReview: true,
        message: e?.message || "Analyse indisponible",
      };
    }
  };

  const retryQuadSlot = useCallback(async (slot: QuadSlotIndex) => {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    setStatus(`Quad : nouvelle capture de la carte ${slot + 1}…`);
    try {
      await cameraRef.current.retryGroupedSlot(slot);
    } catch (error: any) {
      logger.error("SCAN", "Erreur reprise Quad", error);
      setStatus(error?.message || `Impossible de reprendre la carte ${slot + 1}.`);
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  const acceptQuadCandidate = useCallback((slot: QuadSlotProgress) => {
    if (!slot.card) return;
    if (!quadQuotaConsumed && !consumeSuccessfulSession("quad")) {
      setStatus("Quota Scanner atteint. Renouvellement le 5 du mois.");
      return;
    }
    handleQuadCardIdentified(slot.card, slot.slot, slot.confidence);
    setQuadProgress((current) => current.map((item) =>
      item.slot === slot.slot
        ? { ...item, status: "success", message: "Correspondance validée manuellement" }
        : item
    ));
    setStatus(`Quad : carte ${slot.slot + 1} validée — ${slot.card.name}`);
  }, [quadQuotaConsumed, consumeSuccessfulSession, handleQuadCardIdentified]);

  const handlePrimaryScan = async () => {
    const currentQuota = readQuota();
    if (currentQuota.used >= SCANNER_MONTHLY_LIMIT) {
      setQuotaUsed(currentQuota.used);
      setQuotaEnd(currentQuota.end);
      setStatus(`Quota Scanner atteint (${SCANNER_MONTHLY_LIMIT}/${SCANNER_MONTHLY_LIMIT}). Renouvellement le ${new Date(currentQuota.end).toLocaleDateString("fr-FR")}.`);
      return;
    }
    const activeSessionList = batchCaptureMode === "grouped" ? quadList : batchList;
    if (scanMode === "batch" && activeSessionList.length >= SCANNER_BATCH_LIMIT) {
      setStatus(batchCaptureMode === "grouped" ? "Session Quad pleine (4/4). Videz la session pour recommencer." : "Session Batch pleine (4/4). Videz la session pour recommencer.");
      return;
    }
    if (scanMode === "batch" && batchCaptureMode === "grouped") {
      if (!cameraRef.current || scanning) return;
      const label = groupedLanguage === "fr" ? "FR" : groupedLanguage === "en" ? "EN" : groupedLanguage === "ja" ? "JP" : "CN";
      setScanning(true);
      resetScanState();
      setQuadProgress(EMPTY_QUAD_PROGRESS.map((slot) => ({ ...slot })));
      setStatus(`Quad ${label} : analyse progressive des quatre cartes…`);
      try {
        await cameraRef.current.openGroupedScanner();
      } catch (error: any) {
        logger.error("SCAN", "Erreur Quad", error);
        setStatus(error?.message || "Erreur pendant le Quad.");
      } finally {
        setScanning(false);
      }
      return;
    }

    void scan();
  };

  const selectScannerMode = (
    mode: "single" | "batch",
    captureMode: "individual" | "grouped" = "individual"
  ) => {
    setScanMode(mode);
    setBatchCaptureMode(captureMode);
    setModeSelected(true);
    // La caméra est déjà montée et peut avoir émis onReady avant le choix du mode.
    // Ne pas remettre ready à false ici : sinon le bouton déplacé reste désactivé
    // sans qu’un nouvel événement loadedmetadata soit forcément déclenché.
    resetScanState();
    setQuadProgress(EMPTY_QUAD_PROGRESS.map((slot) => ({ ...slot })));

    if (mode === "single") {
      setStatus("Mode Mono sélectionné : cadrez une carte entière.");
    } else if (captureMode === "grouped") {
      setStatus("Quad · Premium : placez 4 cartes dans une seule photo.");
    } else {
      setStatus("Batch · Premium : scannez jusqu’à 4 cartes à la suite.");
    }

    window.setTimeout(() => {
      cameraSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
  };

  const quadConfirmedCount = quadProgress.filter((slot) => slot.status === "success").length;
  const quadReviewCount = quadProgress.filter((slot) => slot.status === "review").length;
  const visibleSessionList = batchCaptureMode === "grouped" ? quadList : batchList;

  return (
    <>
      <Navbar />

      <main className="kt-premium-shell min-h-screen text-white pb-32 selection:bg-cyan-500/20">
        <div className="kt-page-wrap max-w-3xl space-y-4">
          {/* HEADER V5 */}
          <section className="kt-page-header kt-hero-surface flex flex-col items-center gap-4 border text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.11em]">
              <Sparkles className="w-3 h-3" />
              Vision IA avancée
            </div>

            <div>
              <h1 className="kt-page-title">
                Scanner de Cartes
              </h1>
              <p className="kt-page-subtitle mt-0.5">
                Identifiez une carte puis ouvrez sa fiche marché complète.
              </p>
            </div>

            {/* CHOIX DU MODE — aucune caméra ouverte avant sélection */}
            <div className="mt-2 w-full max-w-xl">
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400">
                Choisissez votre mode de scan
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => selectScannerMode("single")}
                  className={`rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                    modeSelected && scanMode === "single"
                      ? "border-cyan-300 bg-cyan-400/[0.12] shadow-[0_0_24px_rgba(34,211,238,.10)]"
                      : "border-cyan-400/70 bg-cyan-400/[0.045] hover:border-cyan-300 hover:bg-cyan-400/[0.08]"
                  }`}
                >
                  <Zap className="mx-auto h-5 w-5 text-cyan-300" />
                  <span className="mt-1.5 block text-[10px] font-black uppercase tracking-[0.09em] text-cyan-300">
                    Mono
                  </span>
                  <span className="mx-auto mt-1 inline-flex items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/[0.08] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.06em] text-cyan-300">
                    Normal
                  </span>
                  <span className="mt-1.5 block text-[7px] font-bold leading-3 text-zinc-300">
                    Identification directe
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectScannerMode("batch", "individual")}
                  className={`rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                    modeSelected && scanMode === "batch" && batchCaptureMode === "individual"
                      ? "border-amber-300 bg-sky-500/[0.14] shadow-[0_0_24px_rgba(245,196,81,.10)]"
                      : "border-amber-300/75 bg-sky-500/[0.075] hover:border-amber-200 hover:bg-sky-500/[0.11]"
                  }`}
                >
                  <Layers className="mx-auto h-5 w-5 text-sky-300" />
                  <span className="mt-1.5 block text-[10px] font-black uppercase tracking-[0.09em] text-sky-300">
                    Batch
                  </span>
                  <span className="mx-auto mt-1 inline-flex items-center justify-center gap-0.5 rounded-full border border-amber-300/30 bg-amber-300/[0.08] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.06em] text-amber-300">
                    <Crown className="h-2.5 w-2.5" /> Premium
                  </span>
                  <span className="mt-1.5 block text-[7px] font-bold leading-3 text-zinc-300">
                    Une carte après l’autre
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => selectScannerMode("batch", "grouped")}
                  className={`rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                    modeSelected && scanMode === "batch" && batchCaptureMode === "grouped"
                      ? "border-amber-300 bg-violet-500/[0.15] shadow-[0_0_24px_rgba(245,196,81,.10)]"
                      : "border-amber-300/75 bg-violet-500/[0.08] hover:border-amber-200 hover:bg-violet-500/[0.12]"
                  }`}
                >
                  <Grid2X2 className="mx-auto h-5 w-5 text-violet-300" />
                  <span className="mt-1.5 block text-[10px] font-black uppercase tracking-[0.09em] text-violet-300">
                    Quad
                  </span>
                  <span className="mx-auto mt-1 inline-flex items-center justify-center gap-0.5 rounded-full border border-amber-300/30 bg-amber-300/[0.08] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.06em] text-amber-300">
                    <Crown className="h-2.5 w-2.5" /> Premium
                  </span>
                  <span className="mt-1.5 block text-[7px] font-bold leading-3 text-zinc-300">
                    Analyse simultanée
                  </span>
                </button>
              </div>

              {!modeSelected ? (
                <p className="mt-3 text-[10px] leading-4 text-zinc-400">
                  Les différences sont indiquées ci-dessus. Choisissez ensuite le mode à utiliser.
                </p>
              ) : null}
            </div>
          </section>

          <div className="rounded-[18px] border border-emerald-300/24 bg-emerald-400/[0.055] px-4 py-3 flex items-center justify-between gap-3 shadow-[0_10px_28px_rgba(16,185,129,.06)]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-emerald-300">Quota scanner</p>
              <p className="mt-0.5 text-xs font-black text-emerald-100">{quotaUsed} / {SCANNER_MONTHLY_LIMIT} sessions</p>
              <p className="mt-0.5 text-[10px] text-zinc-200">Renouvellement le {quotaEnd ? new Date(quotaEnd).toLocaleDateString("fr-FR") : "5 du mois"}</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${quotaBlocked ? "border-amber-300/30 bg-amber-400/[0.08] text-amber-300" : "border-emerald-300/30 bg-emerald-400/[0.09] text-emerald-300"}`}>{Math.max(0, SCANNER_MONTHLY_LIMIT - quotaUsed)} restantes</span>
          </div>

          {modeSelected ? (
            <>
          <section>
            <PremiumCard
              className={`p-4 ${
                scanMode === "single"
                  ? "border-cyan-300/45 bg-cyan-400/[0.055] shadow-[0_0_26px_rgba(34,211,238,.06)]"
                  : batchCaptureMode === "grouped"
                    ? "border-amber-300/45 bg-violet-400/[0.065] shadow-[0_0_26px_rgba(245,196,81,.07)]"
                    : "border-amber-300/45 bg-sky-400/[0.065] shadow-[0_0_26px_rgba(245,196,81,.07)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {scanMode === "single" ? (
                      <Zap className="h-3.5 w-3.5 text-cyan-300" />
                    ) : (
                      <Crown className="h-3.5 w-3.5 text-amber-300" />
                    )}
                    <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${
                      scanMode === "single" ? "text-cyan-300" : "text-amber-300"
                    }`}>
                      {scanMode === "single"
                        ? "Mono · Normal"
                        : batchCaptureMode === "grouped"
                          ? "Quad · Premium"
                          : "Batch · Premium"}
                    </p>
                  </div>
                  <h2 className={`mt-1 truncate text-sm font-black ${
                    scanMode === "single"
                      ? "text-cyan-200"
                      : batchCaptureMode === "grouped"
                        ? "text-violet-200"
                        : "text-sky-200"
                  }`}>
                    {scanMode === "single"
                      ? "Mono · Scan"
                      : batchCaptureMode === "grouped"
                        ? "Quad · Scan simultané"
                        : "Batch · Scan multiples"}
                  </h2>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-100">
                    {scanMode === "single"
                      ? "Scannez une carte dans les langues disponibles dans l’application."
                      : batchCaptureMode === "grouped"
                        ? "Capturez jusqu’à 4 cartes sur une seule photo."
                        : "Scannez jusqu’à 4 cartes à la suite dans la même session."}
                  </p>
                </div>
                <div className="shrink-0 whitespace-nowrap">
                  <PremiumBadge tone={scanMode === "single" ? "cyan" : "violet"}>
                    {scanMode === "single" ? "Mono" : `${batchList.length}/4`}
                  </PremiumBadge>
                </div>
              </div>
            </PremiumCard>
          </section>

          {/* CONSEIL COMMUN — visible dans Mono, Batch et Quad */}
          <div className="rounded-[16px] border border-cyan-300/15 bg-cyan-400/[0.035] px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Languages className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <p className="text-[10px] leading-4 text-zinc-200">
                Pour une session plus fiable, utilisez des cartes de la même langue et gardez-les entièrement visibles, sans reflets.
              </p>
            </div>
          </div>

          {/* Réglage spécifique Quad — sans répéter le module de présentation */}
          <AnimatePresence initial={false}>
            {modeSelected && scanMode === "batch" && batchCaptureMode === "grouped" && (
              <motion.section
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <div className="rounded-[16px] border border-violet-300/18 bg-violet-400/[0.045] p-3">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-violet-300" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-300">
                        Langue des 4 cartes
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-100">
                        Les quatre cartes doivent être de la même langue pour cibler le bon catalogue.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1.5">
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
                        className={`rounded-xl border px-2 py-2 text-[10px] font-black transition-all ${
                          groupedLanguage === value
                            ? "border-violet-300/50 bg-violet-400/15 text-violet-200"
                            : "border-white/[0.06] bg-white/[0.035] text-zinc-100"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* CAMERA */}
          <div ref={cameraSectionRef} data-scan-mode={scanMode === "single" ? "single" : batchCaptureMode === "grouped" ? "quad" : "batch"} className="kt-scanner-stage kt-scan-grid relative aspect-[9/16] overflow-hidden rounded-[24px] border bg-black shadow-[0_24px_70px_rgba(0,0,0,.55)]">
            <ScannerCamera
              ref={cameraRef}
              onReady={handleCameraReady}
              onCardsIdentified={handleCardsIdentified}
              onCardIdentified={handleQuadCardIdentified}
              onQuadProgress={handleQuadProgress}
              identifyCardByImage={handleIdentifyCardByImage}
            />

            <ScannerOverlay
              scanning={scanning}
              hasResult={scanMode === "single" && Boolean(detectedCard)}
              statusText={status}
              quadSlots={quadProgress}
              ready={ready}
              onScan={handlePrimaryScan}
              mode={scanMode === "batch" && batchCaptureMode === "grouped" ? "quad" : scanMode === "batch" ? "batch" : "single"}
            />
          </div>

          {scanMode === "batch" && batchCaptureMode === "grouped" && (
            <section className="kt-premium-panel rounded-[18px] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-200">Résultats progressifs</p>
                  <p className="mt-1 text-[10px] text-zinc-200">
                    {quadConfirmedCount}/4 confirmée(s)
                    {quadReviewCount > 0 ? ` · ${quadReviewCount} à vérifier` : ""}
                  </p>
                </div>
                <span className="rounded-full border border-violet-300/25 bg-violet-400/[0.08] px-2.5 py-1 text-[10px] font-black text-violet-200">
                  {quadConfirmedCount}/4
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {quadProgress.map((slot) => {
                  const success = slot.status === "success";
                  const review = slot.status === "review";
                  const error = slot.status === "error";
                  const processing = slot.status === "processing" || slot.status === "cropping" || slot.status === "ready";
                  const tone = success
                    ? "border-emerald-400/35 bg-emerald-400/[0.07] text-emerald-200"
                    : review
                    ? "border-amber-300/40 bg-amber-400/[0.08] text-amber-100"
                    : error
                    ? "border-rose-400/35 bg-rose-400/[0.07] text-rose-100"
                    : processing
                    ? "border-cyan-300/35 bg-cyan-400/[0.07] text-cyan-100"
                    : "border-white/[0.08] bg-white/[0.025] text-zinc-200";

                  return (
                    <div key={slot.slot} className={`min-w-0 rounded-xl border p-2.5 ${tone}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.11em]">Carte {slot.slot + 1}</span>
                        {processing ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                        ) : success ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-[10px] font-bold text-white">
                        {slot.card?.name || slot.message || slot.label}
                      </p>
                      {slot.card && (
                        <p className="mt-0.5 truncate text-[10px] text-zinc-200">
                          N° {slot.card.number || "—"} · {Math.round(slot.confidence * 100)}%
                        </p>
                      )}
                      {(review || error) && (
                        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                          {review && slot.card && (
                            <button
                              type="button"
                              onClick={() => acceptQuadCandidate(slot)}
                              className="rounded-lg border border-emerald-300/30 bg-emerald-400/[0.10] px-2 py-1 text-[10px] font-black text-emerald-200"
                            >
                              Accepter
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => retryQuadSlot(slot.slot)}
                            disabled={scanning}
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/30 bg-cyan-400/[0.08] px-2 py-1 text-[10px] font-black text-cyan-200 disabled:opacity-40"
                          >
                            <RefreshCw className="h-3 w-3" /> Reprendre
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* STATUS */}
          <div className="kt-premium-panel rounded-[18px] p-4 text-center">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-200 block">
              État du système
            </span>
            <p className="mt-1 text-xs font-bold text-cyan-300">{status}</p>
            {scanning && (
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {["Photo", "Carte", "Match", "Validation"].map((step, index) => (
                  <div key={step} className="rounded-lg border border-cyan-400/15 bg-cyan-400/[0.06] px-1.5 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-cyan-300 animate-pulse" style={{ animationDelay: `${index * 120}ms` }}>
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
                    ? ` (${scanLanguageLabelV293(detectedCard.language)})`
                    : ""}
                </div>

                <div className="text-[10px] text-zinc-100 flex items-center gap-2 mt-0.5 font-medium">
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
                    Qualité de lecture IA
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
            </>
          ) : (
            <section className="rounded-[18px] border border-white/[0.06] bg-white/[0.018] px-4 py-5 text-center">
              <Camera className="mx-auto h-5 w-5 text-cyan-300/65" />
              <p className="mt-2 text-[11px] font-black text-white">
                Aucun mode sélectionné
              </p>
              <p className="mx-auto mt-1 max-w-md text-[10px] leading-4 text-zinc-400">
                Choisissez Mono, Batch ou Quad ci-dessus pour ouvrir la caméra correspondante.
              </p>
            </section>
          )}
        </div>

        {modeSelected && scanMode === "batch" && visibleSessionList.length > 0 ? (
          <section className="mt-4">
            <PremiumCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {batchCaptureMode === "grouped" ? (
                      <Grid2X2 className="h-4 w-4 text-violet-300" />
                    ) : (
                      <Layers className="h-4 w-4 text-sky-300" />
                    )}
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white">
                      {batchCaptureMode === "grouped" ? "Résultats Quad" : "Résultats Batch"}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-300">
                    {visibleSessionList.length}/{SCANNER_BATCH_LIMIT} carte{visibleSessionList.length > 1 ? "s" : ""} conservée{visibleSessionList.length > 1 ? "s" : ""} dans la session.
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={exportBatch}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/18 bg-cyan-400/[0.05] px-2 py-1.5 text-[8px] font-black uppercase text-cyan-300"
                  >
                    <Download className="h-3 w-3" />
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={clearBatch}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-300/18 bg-rose-400/[0.05] px-2 py-1.5 text-[8px] font-black uppercase text-rose-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    Vider
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {visibleSessionList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {item.card.images?.small ? (
                        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                          <Image
                            src={item.card.images.small}
                            alt={item.card.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : null}

                      <div className="min-w-0">
                        <h4 className="truncate text-xs font-black uppercase text-white">
                          {item.card.name}
                        </h4>
                        <p className="truncate text-[10px] text-zinc-300">
                          N° {item.card.number} • {item.card.set?.name}
                        </p>
                        {typeof item.quadSlot === "number" ? (
                          <p className="mt-0.5 text-[9px] font-bold text-violet-300">
                            Zone Quad {item.quadSlot + 1}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => router.push(scannerCardHref(item.card.id))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/18 bg-cyan-400/[0.05] px-2 py-1.5 text-[9px] font-black uppercase text-cyan-300 transition-colors hover:bg-cyan-400/[0.10]"
                        aria-label="Ouvrir la fiche et charger le prix"
                      >
                        <BadgeEuro className="h-3.5 w-3.5" />
                        Prix
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBatchItem(item.id)}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-rose-400/[0.05] hover:text-rose-400"
                        aria-label="Supprimer de la session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </PremiumCard>
          </section>
        ) : null}
      </main>
    </>
  );
}
