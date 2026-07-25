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

    // Permet à la page parente de récupérer le nœud HTML <video> via cameraRef.current.getVideo()
    useImperativeHandle(ref, () => ({
      getVideo: () => videoRef.current,
    }));

    useEffect(() => {
      let stream: MediaStream | null = null;

      async function startCamera() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" }, // Utilise l'appareil photo arrière sur mobile
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              if (onReady) onReady();
            };
          }
        } catch (err) {
          console.error("Erreur d'accès à la caméra :", err);
        }
      }

      startCamera();

      return () => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }, [onReady]);

    return (
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
      />
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;