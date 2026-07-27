"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";

export interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
}

interface ScannerCameraProps {
  onReady?: () => void;
}

const ScannerCamera = forwardRef<ScannerCameraHandle, ScannerCameraProps>(
  ({ onReady }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onReadyRef = useRef(onReady);

    // Mettre à jour la ref pour toujours avoir la dernière version sans redéclencher l'effet
    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    useImperativeHandle(ref, () => ({
      getVideo: () => videoRef.current,
    }));

    useEffect(() => {
      let activeStream: MediaStream | null = null;
      let isMounted = true;

      async function startCamera() {
        try {
          let stream: MediaStream;

          // Tentative 1 : Configuration haute définition idéale avec caméra arrière
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
            // Fallback si la contrainte de résolution stricte échoue sur mobile
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment" },
              audio: false,
            });
          }

          if (!isMounted) {
            // Si le composant s'est démonté entre temps, on coupe le flux immédiatement
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

                // Continuous Focus (Autofocus) sur Android / Chrome
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
    }, []); // Dépendances vides pour n'initialiser la caméra qu'une seule fois au montage

    return (
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="h-full w-full object-cover"
      />
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;