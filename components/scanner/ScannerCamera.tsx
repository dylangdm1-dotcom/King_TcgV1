"use client";
import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Camera } from "lucide-react";

export interface ScannerCameraHandle {
  capture: () => string | null;
}

interface ScannerCameraProps {
  onReady?: () => void;
}

const ScannerCamera = forwardRef<ScannerCameraHandle, ScannerCameraProps>(
  ({ onReady }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setHasPermission(true);
            if (onReady) onReady();
          };
        }
      } catch (err) {
        console.error("Erreur accès caméra:", err);
        setHasPermission(false);
      }
    };

    useEffect(() => {
      startCamera();
      return () => {
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }, []);

    // Expose la fonction de capture au fichier page.tsx via la Ref
    useImperativeHandle(ref, () => ({
      capture: () => {
        if (!videoRef.current || !canvasRef.current) return null;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.9);
      },
    }));

    if (hasPermission === false) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-zinc-900 p-6 text-center">
          <Camera className="w-8 h-8 text-red-500 mb-4" />
          <p className="text-zinc-400 text-sm">Accès à la caméra refusé ou indisponible.</p>
          <button onClick={startCamera} className="mt-4 px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg text-sm">
            Réessayer
          </button>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Overlay TCG (Zone du nom) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-3/4 aspect-[63/88] border-2 border-cyan-400/70 rounded-xl relative">
            <div className="absolute top-0 left-0 w-full h-[15%] border-b border-cyan-400/40 bg-cyan-500/10 flex items-center justify-center">
              <span className="text-cyan-400/80 text-[10px] uppercase font-bold tracking-widest">Zone du nom</span>
            </div>
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400" />
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }
);

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;