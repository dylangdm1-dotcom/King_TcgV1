// components/scanner/ScannerCamera.tsx

"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import type { PokemonCard } from "../../lib/types";
import { createQuadScanSession, processQuadScan, type QuadScanSession } from "../../lib/scanner/quadScanner";
import { X, Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";

export interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
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

    useImperativeHandle(ref, () => ({
      getVideo: () => videoRef.current,
    }));

    const handleOpenQuadScanner = async () => {
      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL("image/jpeg", 0.90);

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
        if (slot.croppedImageUri && identifyCardByImage) {
          slot.status = "processing";
          setQuadSession({ ...processed, slots: updatedSlots });

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
          } catch (e) {
            slot.status = "error";
            slot.errorMsg = "Erreur IA";
          }
          setQuadSession({ ...processed, slots: updatedSlots });
        }
      }

      setIdentifiedCards(foundCards);
      setIsProcessing(false);
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
              } catch (e) {
                console.error(e);
              }
              onReadyRef.current?.();
            };
          }
        } catch (err) {
          console.error(err);
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

        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 px-4">
          <button
            onClick={handleOpenQuadScanner}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-amber-400/40 backdrop-blur-md transition transform active:scale-95"
          >
            <span>📸 Mode 4 Cartes (Grille 2x2)</span>
          </button>
        </div>

        {isQuadOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-black uppercase text-white">Scan Groupé (4 Cartes)</h3>
                </div>
                <button onClick={() => setIsQuadOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {quadSession && (
                  <div className="grid grid-cols-2 gap-3">
                    {quadSession.slots.map((slot) => (
                      <div key={slot.slot} className="bg-neutral-950 border border-zinc-800 rounded-xl p-3 flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-zinc-400">{slot.label}</span>
                        {slot.croppedImageUri && (
                          <div className="relative w-20 h-28 rounded-lg overflow-hidden border border-zinc-800 bg-black">
                            <img src={slot.croppedImageUri} alt={slot.label} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          {slot.status === "processing" && <><Loader2 className="w-3 h-3 text-cyan-400 animate-spin" /><span className="text-cyan-400">Analyse...</span></>}
                          {slot.status === "success" && <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Trouvée</span></>}
                          {slot.status === "error" && <><AlertCircle className="w-3 h-3 text-rose-400" /><span className="text-rose-400">{slot.errorMsg}</span></>}
                          {slot.status === "empty" && <span className="text-zinc-600">En attente</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {identifiedCards.length > 0 && !isProcessing && (
                <div className="p-4 border-t border-zinc-800 bg-neutral-950 flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-400">{identifiedCards.length} carte(s) prête(s)</span>
                  <button
                    onClick={() => {
                      onCardsIdentified?.(identifiedCards);
                      setIsQuadOpen(false);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition"
                  >
                    Valider et Ajouter
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;
