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
  type QuadScanSession,
} from "../../lib/scanner/quadScanner";
import { AlertCircle, Check, Loader2, Sparkles, X } from "lucide-react";

export interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
  openGroupedScanner: () => Promise<void>;
}

interface ScannerCameraProps {
  onReady?: () => void;
  onCardsIdentified?: (cards: PokemonCard[]) => void;
  identifyCardByImage?: (imageBase64: string) => Promise<PokemonCard | null>;
}

const ScannerCamera = forwardRef<ScannerCameraHandle, ScannerCameraProps>(
  ({ onReady, onCardsIdentified, identifyCardByImage }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onReadyRef = useRef(onReady);

    const [isQuadOpen, setIsQuadOpen] = useState(false);
    const [quadSession, setQuadSession] = useState<QuadScanSession | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [identifiedCards, setIdentifiedCards] = useState<PokemonCard[]>([]);

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    const handleOpenQuadScanner = async () => {
      const video = videoRef.current;
      if (!video || isProcessing) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL("image/jpeg", 0.9);

      setIsQuadOpen(true);
      setIsProcessing(true);
      setIdentifiedCards([]);

      const newSession = createQuadScanSession(base64Image);
      const processed = await processQuadScan(newSession);
      setQuadSession(processed);

      const foundCards: PokemonCard[] = [];
      const updatedSlots = [...processed.slots];

      for (let i = 0; i < updatedSlots.length; i++) {
        const slot = updatedSlots[i];
        if (!slot.croppedImageUri || !identifyCardByImage) continue;

        slot.status = "processing";
        setQuadSession({ ...processed, slots: [...updatedSlots] });

        try {
          const card = await identifyCardByImage(slot.croppedImageUri);
          if (card) {
            slot.status = "success";
            slot.cardId = card.id;
            foundCards.push(card);
          } else {
            slot.status = "error";
            slot.errorMsg = "Non reconnue";
          }
        } catch {
          slot.status = "error";
          slot.errorMsg = "Erreur IA";
        }

        setQuadSession({ ...processed, slots: [...updatedSlots] });
      }

      setIdentifiedCards(foundCards);
      setIsProcessing(false);
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

        {isQuadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[26px] border border-white/[0.1] bg-[#121820] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-300" />
                    <h3 className="text-sm font-black text-white">Analyse groupée</h3>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    Chaque quadrant est analysé séparément.
                  </p>
                </div>
                <button
                  onClick={() => setIsQuadOpen(false)}
                  className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {quadSession ? (
                  <div className="grid grid-cols-2 gap-3">
                    {quadSession.slots.map((slot) => (
                      <div
                        key={slot.slot}
                        className="flex flex-col items-center gap-2 rounded-[20px] border border-white/[0.08] bg-[#1a212a] p-3"
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                          {slot.label}
                        </span>
                        {slot.croppedImageUri && (
                          <div className="relative h-28 w-20 overflow-hidden rounded-xl border border-white/[0.08] bg-black">
                            <img
                              src={slot.croppedImageUri}
                              alt={slot.label}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          {slot.status === "processing" && (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                              <span className="text-cyan-300">Analyse…</span>
                            </>
                          )}
                          {slot.status === "success" && (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-300">Trouvée</span>
                            </>
                          )}
                          {slot.status === "error" && (
                            <>
                              <AlertCircle className="h-3 w-3 text-rose-400" />
                              <span className="text-rose-300">{slot.errorMsg}</span>
                            </>
                          )}
                          {slot.status === "empty" && (
                            <span className="text-zinc-500">En attente</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-52 items-center justify-center text-zinc-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Préparation des quatre zones…
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.08] bg-[#0f141a] p-4">
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-cyan-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyse des quatre cartes
                  </div>
                ) : identifiedCards.length > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-emerald-300">
                      {identifiedCards.length} carte(s) prête(s)
                    </span>
                    <button
                      onClick={() => {
                        onCardsIdentified?.(identifiedCards);
                        setIsQuadOpen(false);
                      }}
                      className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#06120d] transition hover:brightness-105 active:scale-[0.98]"
                    >
                      Ajouter au Batch
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-xs text-zinc-500">
                    Aucune carte reconnue. Reprenez la photo avec plus de lumière.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;
