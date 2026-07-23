"use client";

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

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
    const readyRef = useRef(false);

    useImperativeHandle(ref, () => ({
      capture() {
        const video = videoRef.current;
      
        if (!video) return null;
      
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          return null;
        }
      
        // Vérifie que la vidéo est réellement prête
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          return null;
        }
      
        return captureFrame(video);
      },
    }));

    useEffect(() => {
      let cancelled = false;

      async function startCamera() {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: {
                ideal: "environment",
              },

              width: {
                ideal: 1920,
              },

              height: {
                ideal: 1080,
              },

              aspectRatio: {
                ideal: 1.777,
              },

              frameRate: {
                ideal: 30,
              },
            },
          });

          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;

          const video = videoRef.current;

          if (!video) return;

          video.srcObject = stream;

          const handleReady = () => {
            if (readyRef.current) return;

            readyRef.current = true;
            onReady?.();
          };

          video.onloadedmetadata = handleReady;

          await video.play();
          const track = stream.getVideoTracks()[0];

if (track) {
  try {
    await track.applyConstraints({
      advanced: [
        {
          // Les navigateurs qui ne supportent pas ces options les ignorent.
          // On les passe volontairement via "any" pour rester compatibles.
          ...( { focusMode: "continuous" } as any ),
          ...( { exposureMode: "continuous" } as any ),
          ...( { whiteBalanceMode: "continuous" } as any ),
        },
      ],
    });
  } catch (e) {
    // Certains appareils ne supportent pas ces contraintes.
    console.debug("[Scanner] Contraintes avancées non supportées", e);
  }
}

          if (video.readyState >= 2) {
            handleReady();
          }

        } catch (err) {
          console.error("[Scanner Camera]", err);
        }
      }

      startCamera();

      return () => {
        cancelled = true;
        readyRef.current = false;

        if (streamRef.current) {
          streamRef.current
            .getTracks()
            .forEach((track) => track.stop());
        }
      };
    }, [onReady]);

    return (
      <div className="relative h-full w-full overflow-hidden rounded-xl bg-black">
    
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
    
      </div>
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;