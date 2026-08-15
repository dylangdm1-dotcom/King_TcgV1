"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { PokemonCard } from "../../lib/types";
import {
  createQuadScanSession,
  processQuadScan,
  type QuadImageQuality,
  type QuadSlotIndex,
  type QuadSlotStatus,
} from "../../lib/scanner/quadScanner";
import { captureFrame } from "../../lib/scanner/capture";

export type QuadIdentificationResult = {
  card: PokemonCard | null;
  confidence: number;
  requiresReview: boolean;
  message?: string;
};

export type QuadSlotProgress = {
  slot: QuadSlotIndex;
  label: string;
  status: QuadSlotStatus;
  attempts: number;
  confidence: number;
  quality?: QuadImageQuality;
  card?: PokemonCard;
  message?: string;
};

export interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
  openGroupedScanner: () => Promise<void>;
  retryGroupedSlot: (slot: QuadSlotIndex) => Promise<void>;
}

interface ScannerCameraProps {
  onReady?: () => void;
  onCardsIdentified?: (cards: PokemonCard[]) => void;
  onCardIdentified?: (card: PokemonCard, slot: number, confidence?: number) => void;
  onQuadProgress?: (slots: QuadSlotProgress[]) => void;
  identifyCardByImage?: (
    imageBase64: string,
    context: { slot: QuadSlotIndex; attempt: 1 | 2; quality?: QuadImageQuality }
  ) => Promise<QuadIdentificationResult>;
}

const EMPTY_PROGRESS: QuadSlotProgress[] = [
  { slot: 0, label: "Haut - Gauche", status: "empty", attempts: 0, confidence: 0 },
  { slot: 1, label: "Haut - Droite", status: "empty", attempts: 0, confidence: 0 },
  { slot: 2, label: "Bas - Gauche", status: "empty", attempts: 0, confidence: 0 },
  { slot: 3, label: "Bas - Droite", status: "empty", attempts: 0, confidence: 0 },
];

async function waitForStableVideoFrame(video: HTMLVideoElement) {
  const videoWithCallback = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: () => void) => number;
  };
  if (videoWithCallback.requestVideoFrameCallback) {
    await new Promise<void>((resolve) => videoWithCallback.requestVideoFrameCallback?.(() => resolve()));
    return;
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

const ScannerCamera = forwardRef<ScannerCameraHandle, ScannerCameraProps>(
  (
    {
      onReady,
      onCardsIdentified,
      onCardIdentified,
      onQuadProgress,
      identifyCardByImage,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onReadyRef = useRef(onReady);
    const progressRef = useRef<QuadSlotProgress[]>(EMPTY_PROGRESS);
    const processingRef = useRef(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    const emitProgress = (next: QuadSlotProgress[]) => {
      progressRef.current = next;
      onQuadProgress?.(next);
    };

    const patchProgress = (
      slot: QuadSlotIndex,
      patch: Partial<QuadSlotProgress>
    ) => {
      emitProgress(progressRef.current.map((item) =>
        item.slot === slot ? { ...item, ...patch } : item
      ));
    };

    const runGroupedScanner = async (selectedSlots?: QuadSlotIndex[]) => {
      const video = videoRef.current;
      if (!video || processingRef.current || isProcessing || !identifyCardByImage) return;

      processingRef.current = true;
      setIsProcessing(true);
      const foundCards: PokemonCard[] = [];

      try {
        await waitForStableVideoFrame(video);
        // Quad uniquement : capture haute définition. Mono/Batch conservent
        // leurs paramètres historiques dans app/scanner/page.tsx.
        const base64Image = captureFrame(video, {
          maxLongEdge: 2200,
          jpegQuality: 0.92,
        });
        if (!base64Image) throw new Error("Capture Quad indisponible");

        const selected = selectedSlots?.length
          ? selectedSlots
          : ([0, 1, 2, 3] as QuadSlotIndex[]);
        const session = await processQuadScan(
          createQuadScanSession(base64Image),
          selected
        );

        if (!selectedSlots?.length) {
          emitProgress(session.slots.map((slot) => ({
            slot: slot.slot,
            label: slot.label,
            status: slot.status,
            attempts: 0,
            confidence: 0,
            quality: slot.quality,
            message: slot.errorMsg,
          })));
        } else {
          for (const slot of session.slots.filter((item) => selected.includes(item.slot))) {
            patchProgress(slot.slot, {
              status: slot.status,
              attempts: 0,
              confidence: 0,
              quality: slot.quality,
              card: undefined,
              message: slot.errorMsg,
            });
          }
        }

        const work = session.slots.filter((slot) =>
          selected.includes(slot.slot) && Boolean(slot.croppedImageUri)
        );
        let cursor = 0;

        const worker = async () => {
          while (cursor < work.length) {
            const slot = work[cursor++];
            if (!slot.croppedImageUri) continue;

            patchProgress(slot.slot, {
              status: "processing",
              attempts: 1,
              confidence: 0,
              message: slot.quality?.warning || "Lecture de la carte…",
            });

            let best: QuadIdentificationResult | null = null;
            try {
              best = await identifyCardByImage(slot.croppedImageUri, {
                slot: slot.slot,
                attempt: 1,
                quality: slot.quality,
              });

              if ((!best.card || best.requiresReview) && slot.enhancedImageUri) {
                patchProgress(slot.slot, {
                  status: "processing",
                  attempts: 2,
                  message: "Second passage renforcé…",
                });
                const second = await identifyCardByImage(slot.enhancedImageUri, {
                  slot: slot.slot,
                  attempt: 2,
                  quality: slot.quality,
                });
                if (!best.card || second.confidence > best.confidence) best = second;
              }
            } catch (error: any) {
              best = {
                card: null,
                confidence: 0,
                requiresReview: true,
                message: error?.message || "Carte non reconnue",
              };
            }

            if (best?.card && !best.requiresReview && best.confidence >= 0.72) {
              const attempts = progressRef.current.find((item) => item.slot === slot.slot)?.attempts || 1;
              foundCards.push(best.card);
              patchProgress(slot.slot, {
                status: "success",
                attempts,
                confidence: best.confidence,
                card: best.card,
                message: "Carte confirmée",
              });
              onCardIdentified?.(best.card, slot.slot, best.confidence);
            } else if (best?.card) {
              patchProgress(slot.slot, {
                status: "review",
                confidence: best.confidence,
                card: best.card,
                message: best.message || "Correspondance à vérifier",
              });
            } else {
              patchProgress(slot.slot, {
                status: "error",
                confidence: 0,
                card: undefined,
                message: best?.message || slot.quality?.warning || "Zone non reconnue",
              });
            }
          }
        };

        // Deux analyses simultanées accélèrent le Quad sans envoyer les quatre
        // appels d'un coup, ce qui limite les erreurs de quota sur mobile.
        await Promise.all([worker(), worker()]);
        onCardsIdentified?.(foundCards);
      } finally {
        processingRef.current = false;
        setIsProcessing(false);
      }
    };

    useImperativeHandle(ref, () => ({
      getVideo: () => videoRef.current,
      openGroupedScanner: () => runGroupedScanner(),
      retryGroupedSlot: (slot) => runGroupedScanner([slot]),
    }));

    useEffect(() => {
      let activeStream: MediaStream | null = null;
      let isMounted = true;

      async function startCamera() {
        try {
          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: "environment" },
                width: { min: 640, ideal: 1920 },
                height: { min: 480, ideal: 1080 },
                frameRate: { ideal: 30 },
              },
              audio: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
              audio: false,
            });
          }

          if (!isMounted) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          activeStream = stream;
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            video.onloadedmetadata = async () => {
              if (!isMounted) return;
              try {
                await video.play();
              } catch (error) {
                console.error(error);
              }
              onReadyRef.current?.();
            };
          }
        } catch (error) {
          console.error(error);
        }
      }

      startCamera();

      return () => {
        isMounted = false;
        activeStream?.getTracks().forEach((track) => track.stop());
      };
    }, []);

    return (
      <div className="relative h-full w-full overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;
