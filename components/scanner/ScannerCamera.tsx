"use client";

import {
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

import { captureFrame } from "../../lib/scanner/capture";

import {
X,
Sparkles,
Check,
AlertCircle,
Loader2,
Grid2X2,
} from "lucide-react";

export interface ScannerCameraHandle {
getVideo: () => HTMLVideoElement | null;
}

interface ScannerCameraProps {
onReady?: () => void;
onCardsIdentified?: (cards: PokemonCard[]) => void;
identifyCardByImage?: (
imageBase64: string
) => Promise<PokemonCard | null>;
}

const ScannerCamera = forwardRef<
ScannerCameraHandle,
ScannerCameraProps

>(function ScannerCamera(
 { onReady, onCardsIdentified, identifyCardByImage },
 ref
 ) {
 const videoRef = useRef<HTMLVideoElement>(null);
 const onReadyRef = useRef(onReady);

const [isQuadOpen, setIsQuadOpen] = useState(false);
const [quadSession, setQuadSession] =
useState<QuadScanSession | null>(null);
const [isProcessing, setIsProcessing] = useState(false);
const [identifiedCards, setIdentifiedCards] =
useState<PokemonCard[]>([]);
const [cameraError, setCameraError] =
useState<string | null>(null);

useEffect(() => {
onReadyRef.current = onReady;
}, [onReady]);

useImperativeHandle(
ref,
() => ({
getVideo: () => videoRef.current,
}),
[]
);

/**

* Ouvre le mode Scan 4 cartes.
*
* La capture passe par le helper V5.0 centralisé.
  */
  const handleOpenQuadScanner = async () => {
  const video = videoRef.current;

if (

  !video ||
  !identifyCardByImage ||
  isProcessing
) {
  return;
}

const sourceImageUri = captureFrame(video);

if (!sourceImageUri) {
  setCameraError(
    "Impossible de capturer l'image depuis la caméra."
  );
  return;
}

setCameraError(null);
setIsQuadOpen(true);
setIsProcessing(true);
setIdentifiedCards([]);

try {
  const session =
    createQuadScanSession(sourceImageUri);

  const processedSession =
    await processQuadScan(session);

  setQuadSession(processedSession);

  const foundCards: PokemonCard[] = [];
  let currentSession = processedSession;

  for (const slot of processedSession.slots) {
    if (!slot.croppedImageUri) {
      currentSession = {
        ...currentSession,
        slots: currentSession.slots.map((item) =>
          item.slot === slot.slot
            ? {
                ...item,
                status: "error",
                errorMsg: "Image indisponible",
              }
            : item
        ),
      };

      setQuadSession(currentSession);
      continue;
    }

    currentSession = {
      ...currentSession,
      slots: currentSession.slots.map((item) =>
        item.slot === slot.slot
          ? {
              ...item,
              status: "processing",
              errorMsg: undefined,
            }
          : item
      ),
    };

    setQuadSession(currentSession);

    try {
      const card = await identifyCardByImage(
        slot.croppedImageUri
      );

      if (card) {
        foundCards.push(card);

        currentSession = {
          ...currentSession,
          slots: currentSession.slots.map((item) =>
            item.slot === slot.slot
              ? {
                  ...item,
                  status: "success",
                  cardId: card.id,
                  errorMsg: undefined,
                }
              : item
          ),
        };
      } else {
        currentSession = {
          ...currentSession,
          slots: currentSession.slots.map((item) =>
            item.slot === slot.slot
              ? {
                  ...item,
                  status: "error",
                  cardId: undefined,
                  errorMsg: "Carte non reconnue",
                }
              : item
          ),
        };
      }
    } catch (error) {
      console.error(
        "[Scanner V5.0] Erreur d'identification du slot",
        error
      );

      currentSession = {
        ...currentSession,
        slots: currentSession.slots.map((item) =>
          item.slot === slot.slot
            ? {
                ...item,
                status: "error",
                cardId: undefined,
                errorMsg: "Erreur d'analyse IA",
              }
            : item
        ),
      };
    }

    setQuadSession(currentSession);
    setIdentifiedCards([...foundCards]);
  }
} catch (error) {
  console.error(
    "[Scanner V5.0] Erreur du scan groupé",
    error
  );

  setCameraError(
    "Une erreur est survenue pendant le scan groupé."
  );
} finally {
  setIsProcessing(false);
}

};

/**

* Initialisation de la caméra.
  */
  useEffect(() => {
  let activeStream: MediaStream | null = null;
  let mounted = true;

const startCamera = async () => {

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    setCameraError(
      "La caméra n'est pas disponible sur cet appareil."
    );
    return;
  }

  try {
    let stream: MediaStream;

    try {
      stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              min: 640,
              ideal: 1920,
            },
            height: {
              min: 480,
              ideal: 1080,
            },
            frameRate: {
              ideal: 30,
              max: 60,
            },
          },
          audio: false,
        });
    } catch {
      stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
          },
          audio: false,
        });
    }

    if (!mounted) {
      stream
        .getTracks()
        .forEach((track) => track.stop());

      return;
    }

    activeStream = stream;

    const video = videoRef.current;

    if (!video) {
      stream
        .getTracks()
        .forEach((track) => track.stop());

      return;
    }

    video.srcObject = stream;

    video.onloadedmetadata = async () => {
      if (!mounted) return;

      try {
        await video.play();

        setCameraError(null);
        onReadyRef.current?.();
      } catch (error) {
        console.error(
          "[Scanner V5.0] Impossible de démarrer la vidéo",
          error
        );

        setCameraError(
          "Impossible de démarrer la caméra."
        );
      }
    };
  } catch (error) {
    console.error(
      "[Scanner V5.0] Accès caméra refusé ou indisponible",
      error
    );

    if (mounted) {
      setCameraError(
        "Accès à la caméra impossible. Vérifiez les autorisations du navigateur."
      );
    }
  }
};

startCamera();

return () => {
  mounted = false;

  if (activeStream) {
    activeStream
      .getTracks()
      .forEach((track) => track.stop());

    activeStream = null;
  }

  const video = videoRef.current;

  if (video) {
    video.pause();
    video.srcObject = null;
    video.onloadedmetadata = null;
  }
};

}, []);

const closeQuadScanner = () => {
if (isProcessing) return;

setIsQuadOpen(false);
setQuadSession(null);
setIdentifiedCards([]);

};

const validateQuadResults = () => {
if (
identifiedCards.length === 0 ||
isProcessing
) {
return;
}

onCardsIdentified?.(identifiedCards);
closeQuadScanner();

};

return ( <div className="relative h-full w-full overflow-hidden bg-black">
{/* Flux caméra */} <video
     ref={videoRef}
     playsInline
     muted
     autoPlay
     className="h-full w-full object-cover"
   />

```
  {/* Erreur caméra */}
  {cameraError && (
    <div className="absolute left-4 right-4 top-4 z-30 rounded-xl border border-rose-500/20 bg-black/80 px-4 py-3 backdrop-blur-md">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />

        <p className="text-[11px] font-bold leading-relaxed text-rose-300">
          {cameraError}
        </p>
      </div>
    </div>
  )}

  {/* Mode Scan 4 cartes */}
  <div className="absolute right-4 top-4 z-20">
    <button
      type="button"
      onClick={handleOpenQuadScanner}
      disabled={
        isProcessing ||
        !identifyCardByImage
      }
      className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-neutral-950/90 px-3 py-2 text-[10px] font-black uppercase text-cyan-400 shadow-xl backdrop-blur-md transition hover:bg-neutral-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isProcessing ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <Grid2X2 className="h-3.5 w-3.5 shrink-0" />
      )}

      <span>
        {isProcessing
          ? "Analyse V5.0..."
          : "Scan 4 cartes"}
      </span>
    </button>
  </div>

  {/* Scanner groupé */}
  {isQuadOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />

            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-white">
                Scan groupé V5.0
              </h3>

              <p className="mt-0.5 text-[10px] font-medium text-zinc-600">
                Analyse de 4 cartes simultanément
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeQuadScanner}
            disabled={isProcessing}
            aria-label="Fermer le scanner groupé"
            className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Slots */}
        <div className="flex-1 overflow-y-auto p-5">
          {quadSession ? (
            <div className="grid grid-cols-2 gap-3">
              {quadSession.slots.map((slot) => (
                <div
                  key={slot.slot}
                  className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-neutral-900/50 p-3"
                >
                  <span className="text-[10px] font-black uppercase text-zinc-400">
                    {slot.label}
                  </span>

                  {slot.croppedImageUri ? (
                    <div className="relative h-28 w-20 overflow-hidden rounded-lg border border-zinc-800 bg-black">
                      <img
                        src={slot.croppedImageUri}
                        alt={slot.label}
                        className="h-full w-full object-cover"
                      />

                      {slot.status ===
                        "processing" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-28 w-20 items-center justify-center rounded-lg border border-zinc-800 bg-black">
                      <AlertCircle className="h-5 w-5 text-zinc-700" />
                    </div>
                  )}

                  <div className="flex min-h-[16px] items-center gap-1 text-center text-[10px] font-bold">
                    {slot.status ===
                      "processing" && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />

                        <span className="text-cyan-400">
                          Analyse V5.0...
                        </span>
                      </>
                    )}

                    {slot.status === "success" && (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />

                        <span className="text-emerald-400">
                          Carte reconnue
                        </span>
                      </>
                    )}

                    {slot.status === "error" && (
                      <>
                        <AlertCircle className="h-3 w-3 text-rose-400" />

                        <span className="text-rose-400">
                          {slot.errorMsg ||
                            "Échec"}
                        </span>
                      </>
                    )}

                    {slot.status === "empty" && (
                      <span className="text-zinc-600">
                        En attente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[250px] items-center justify-center">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                Préparation du scan...
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-neutral-950 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-zinc-500">
              {isProcessing
                ? "Identification en cours..."
                : `${identifiedCards.length} carte${
                    identifiedCards.length > 1
                      ? "s"
                      : ""
                  } reconnue${
                    identifiedCards.length > 1
                      ? "s"
                      : ""
                  }`}
            </span>

            <button
              type="button"
              onClick={validateQuadResults}
              disabled={
                isProcessing ||
                identifiedCards.length === 0
              }
              className="rounded-xl bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Valider et ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
);
});

ScannerCamera.displayName = "ScannerCamera";

export default ScannerCamera;
