"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { captureFrame } from "@/lib/scanner/capture";

export type ScannerCameraHandle = {
  capture: () => string | null;
};

type Props = {
  onReady?: () => void;
};

const ScannerCamera = forwardRef<ScannerCameraHandle, Props>(
  function ScannerCamera({ onReady }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useImperativeHandle(ref, () => ({
      capture() {
        const video = videoRef.current;
        if (!video) return null;

        return captureFrame(video);
      }
    }));

    useEffect(() => {
      let cancelled = false;

      async function start() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal: "environment"
              }
            },
            audio: false,
          });

          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;

          const video = videoRef.current;

          if (video) {
            video.srcObject = stream;

            await video.play().catch((error) => {
              console.warn(
                "[King_TCG] Lecture vidéo bloquée :",
                error
              );
            });

            onReady?.();
          }

        } catch (error) {
          console.error(
            "[King_TCG] Erreur initialisation flux caméra :",
            error
          );
        }
      }

      start();

      return () => {
        cancelled = true;

        if (streamRef.current) {
          streamRef.current
            .getTracks()
            .forEach((track) => track.stop());

          streamRef.current = null;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
    }, [onReady]);

    return (
      <div className="relative w-full h-full overflow-hidden rounded-xl border border-zinc-900 bg-neutral-950">

        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover grayscale-[20%] contrast-[105%]"
        />

        {/* Grille d'alignement optique minimaliste style King_TCG */}
        <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 m-6 rounded-lg">

          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500/40" />

          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500/40" />

          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500/40" />

          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500/40" />

        </div>

      </div>
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;