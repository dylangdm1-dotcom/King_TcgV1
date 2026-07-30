// components/ScannerCamera.tsx

"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import QuadScannerModal from "./QuadScannerModal";
import type { PokemonCard } from "../lib/types";

export interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
}

interface ScannerCameraProps {
  onReady?: () => void;
  onCardsIdentified?: (cards: PokemonCard[]) => void;
  // Fonction externe optionnelle pour identifier un crop unique par IA
  identifyCardByImage?: (imageBase64: string) => Promise<PokemonCard | null>;
}

const ScannerCamera = forwardRef<ScannerCameraHandle, ScannerCameraProps>(
  ({ onReady, onCardsIdentified, identifyCardByImage }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onReadyRef = useRef(onReady);

    // État pour afficher ou masquer la modale du Quad Scanner (V5)
    const [isQuadModalOpen, setIsQuadModalOpen] = useState(false);

    // Mettre à jour la ref pour toujours avoir la dernière version sans redéclencher l'effet
    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useImperativeHandle(ref, () => ({
      getVideo: () => videoRef.current,
    }));

    // Capture instantanée du flux vidéo actuel sous forme d'image Base64 pour le Quad Scanner
    const handleCaptureQuadImageFromVideo = (): string | null => {
      const video = videoRef.current;
      if (!video) return null;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.90);
    };

    const handleOpenQuadScanner = () => {
      const base64Image = handleCaptureQuadImageFromVideo();
      if (base64Image) {
        // On peut stocker ou passer l'image directement, ou ouvrir la modale qui permettra d'importer/capturer
        setIsQuadModalOpen(true);
      } else {
        setIsQuadModalOpen(true);
      }
    };

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
          } catch (firstErr) {
            console.warn("Échec configuration caméra HD, fallback vers config standard...", firstErr);
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

                const track = activeStream?.getVideoTracks()[0];
                if (track) {
                  const capabilities = (track.getCapabilities?.() || {}) as Record<string, any>;
                  if ("focusMode" in capabilities) {
                    await track.applyConstraints({
                      advanced: [{ focusMode: "continuous" } as any],
                    });
                  }
                }
              } catch (e) {
                console.error("Erreur lecture flux vidéo :", e);
              }

              onReadyRef.current?.();
            };
          }
        } catch (err) {
          console.error("Erreur d'accès à la caméra :", err);
        }
      }

      startCamera();

      return () => {
        isMounted = false;
        if (activeStream) {
          activeStream.getTracks().forEach((track) => track.stop());
        }
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

        {/* 🚀 Bouton Flottant V5 : Activer le Scan Groupé (4 Cartes) par-dessus la caméra */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 px-4">
          <button
            onClick={handleOpenQuadScanner}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-amber-400/40 backdrop-blur-md transition transform active:scale-95"
          >
            <span>📸 Mode 4 Cartes (Grille 2x2)</span>
          </button>
        </div>

        {/* Modale du Quad Scanner connectée */}
        {isQuadModalOpen && (
          <QuadScannerModal
            isOpen={isQuadModalOpen}
            onClose={() => setIsQuadModalOpen(false)}
            onCardsIdentified={(cards) => {
              onCardsIdentified?.(cards);
              setIsQuadModalOpen(false);
            }}
            identifyCardByImage={async (imgUri) => {
              if (identifyCardByImage) {
                return await identifyCardByImage(imgUri);
              }
              return null;
            }}
          />
        )}
      </div>
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;
