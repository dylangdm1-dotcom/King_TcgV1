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

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

          <div className="relative h-[72%] w-[72%] rounded-2xl border-2 border-cyan-400">

            <div className="absolute -left-1 -top-1 h-10 w-10 border-l-4 border-t-4 border-cyan-400" />

            <div className="absolute -right-1 -top-1 h-10 w-10 border-r-4 border-t-4 border-cyan-400" />

            <div className="absolute -left-1 -bottom-1 h-10 w-10 border-l-4 border-b-4 border-cyan-400" />

            <div className="absolute -right-1 -bottom-1 h-10 w-10 border-r-4 border-b-4 border-cyan-400" />

          </div>

        </div>

      </div>
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;
