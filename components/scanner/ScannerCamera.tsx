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
} from "../../lib/scanner/quadScanner";
import { captureFrame } from "../../lib/scanner/capture";

export interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
  openGroupedScanner: () => Promise<void>;
}

interface ScannerCameraProps {
  onReady?: () => void;
  onCardsIdentified?: (cards: PokemonCard[]) => void;
  onCardIdentified?: (card: PokemonCard, slot: number) => void;
  identifyCardByImage?: (imageBase64: string) => Promise<PokemonCard | null>;
}

const ScannerCamera = forwardRef<ScannerCameraHandle, ScannerCameraProps>(
  ({ onReady, onCardsIdentified, onCardIdentified, identifyCardByImage }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onReadyRef = useRef(onReady);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    const handleOpenQuadScanner = async () => {
      const video = videoRef.current;
      if (!video || isProcessing) return;

      // Utilise exactement la zone vidéo visible à l'écran (object-cover inclus),
      // comme le scanner Mono. Les crops Quad correspondent donc aux cadres affichés.
      const base64Image = captureFrame(video);
      if (!base64Image) return;

      setIsProcessing(true);
      const foundCards: PokemonCard[] = [];

      try {
        const session = await processQuadScan(createQuadScanSession(base64Image));

        // Traitement volontairement séquentiel : les résultats peuvent apparaître
        // un par un dans le Batch au lieu d'attendre les quatre analyses.
        for (let i = 0; i < session.slots.length; i++) {
          const slot = session.slots[i];
          if (!slot.croppedImageUri || !identifyCardByImage) continue;

          try {
            const card = await identifyCardByImage(slot.croppedImageUri);
            if (card) {
              foundCards.push(card);
              onCardIdentified?.(card, i);
            }
          } catch {
            // Une zone ratée ne doit jamais annuler les autres cartes du Quad.
          }
        }

        onCardsIdentified?.(foundCards);
      } finally {
        setIsProcessing(false);
      }
    };

    useImperativeHandle(ref, () => ({
      getVideo: () => videoRef.current,
      openGroupedScanner: handleOpenQuadScanner,
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
