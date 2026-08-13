"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ChevronRight,
  ChevronDown,
  ImagePlus,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

import type {
  PSAGradeAnalysis,
  PSAManualReview,
  PSAPhotoId,
} from "@/lib/psa/grading";

type PhotoEntry = {
  dataUrl: string;
  source: "camera" | "gallery";
};

type CaptureStep = {
  id: PSAPhotoId;
  shortTitle: string;
  title: string;
  description: string;
  hint: string;
  overlayLabel: string;
  tilted: boolean;
};

const CAPTURE_STEPS: CaptureStep[] = [
  {
    id: "front",
    shortTitle: "Avant",
    title: "Face avant",
    description: "Cadrez la carte entière, bien droite et parallèle au téléphone.",
    hint: "Lumière diffuse, aucun reflet et les quatre coins visibles.",
    overlayLabel: "Face avant · carte droite",
    tilted: false,
  },
  {
    id: "back",
    shortTitle: "Arrière",
    title: "Face arrière",
    description: "Retournez la carte et conservez exactement le même cadrage.",
    hint: "Le dos doit être net pour contrôler centrage, bords et blanchiment.",
    overlayLabel: "Face arrière · carte droite",
    tilted: false,
  },
  {
    id: "frontAngle",
    shortTitle: "Angle AV",
    title: "Inclinaison avant",
    description: "Inclinez légèrement la face avant sous une lumière latérale.",
    hint: "Cette vue révèle rayures, plis, indentations et défauts de surface.",
    overlayLabel: "Face avant · légère inclinaison",
    tilted: true,
  },
  {
    id: "backAngle",
    shortTitle: "Angle AR",
    title: "Inclinaison arrière",
    description: "Inclinez le dos pour exposer les coins et les tranches.",
    hint: "Gardez toute la carte visible et évitez les ombres fortes.",
    overlayLabel: "Face arrière · légère inclinaison",
    tilted: true,
  },
];

const EMPTY_PHOTOS: Record<PSAPhotoId, PhotoEntry | null> = {
  front: null,
  back: null,
  frontAngle: null,
  backAngle: null,
};

const CRITERIA = [
  { key: "centering", label: "Centrage" },
  { key: "corners", label: "Coins" },
  { key: "edges", label: "Bords" },
  { key: "surface", label: "Surface" },
] as const;

function scoreTone(score: number) {
  if (score >= 9) return "text-emerald-300 border-emerald-300/20 bg-emerald-400/[0.07]";
  if (score >= 7) return "text-blue-300 border-blue-300/20 bg-blue-400/[0.07]";
  if (score >= 5) return "text-amber-300 border-amber-300/20 bg-amber-400/[0.07]";
  return "text-rose-300 border-rose-300/20 bg-rose-400/[0.07]";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function compressFile(file: File): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await loadImage(rawDataUrl);
  const maxWidth = 1000;
  const maxHeight = 1400;
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.76);
}

export default function PSAGradeCapture() {
  const [photos, setPhotos] = useState<Record<PSAPhotoId, PhotoEntry | null>>(
    EMPTY_PHOTOS
  );
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [reviewDataUrl, setReviewDataUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PSAGradeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isRefined, setIsRefined] = useState(false);
  const [manualReview, setManualReview] = useState<PSAManualReview>({
    surfaceMarks: "none",
    cornerWear: "none",
    edgeWhitening: "none",
    printLine: "none",
    indentation: "none",
    creaseOrMajorDefect: false,
  });
  const [premiumControlsOpen, setPremiumControlsOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const completedCount = useMemo(
    () => Object.values(photos).filter(Boolean).length,
    [photos]
  );
  const isComplete = completedCount === CAPTURE_STEPS.length;
  const activeStep = CAPTURE_STEPS[activeStepIndex];

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  useEffect(() => {
    if (!cameraOpen || reviewDataUrl) return;

    let cancelled = false;

    async function openStream() {
      setCameraError("");
      setCameraReady(false);
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Caméra indisponible dans ce navigateur. Utilisez la galerie.");
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setCameraReady(true);
        }
      } catch {
        setCameraError(
          "Accès caméra refusé ou indisponible. Autorisez la caméra ou importez une photo."
        );
      }
    }

    openStream();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen, reviewDataUrl, activeStepIndex]);

  useEffect(() => () => stopCamera(), []);

  const openCapture = (stepIndex?: number) => {
    const nextIndex =
      typeof stepIndex === "number"
        ? stepIndex
        : Math.max(
            0,
            CAPTURE_STEPS.findIndex((step) => !photos[step.id])
          );

    setActiveStepIndex(nextIndex === -1 ? 0 : nextIndex);
    setReviewDataUrl(null);
    setCameraError("");
    setAnalysisError("");
    setCameraOpen(true);
  };

  const closeCapture = () => {
    stopCamera();
    setCameraOpen(false);
    setReviewDataUrl(null);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraReady || !video.videoWidth || !video.videoHeight) return;

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const targetAspect = 63 / 88;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;

    if (sourceWidth / sourceHeight > targetAspect) {
      cropWidth = sourceHeight * targetAspect;
    } else {
      cropHeight = sourceWidth / targetAspect;
    }

    const sourceX = (sourceWidth - cropWidth) / 2;
    const sourceY = (sourceHeight - cropHeight) / 2;
    const outputWidth = 900;
    const outputHeight = Math.round(outputWidth / targetAspect);
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(
      video,
      sourceX,
      sourceY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    setReviewDataUrl(canvas.toDataURL("image/jpeg", 0.78));
    stopCamera();
  };

  const validateCurrentPhoto = () => {
    if (!reviewDataUrl) return;

    setPhotos((current) => ({
      ...current,
      [activeStep.id]: { dataUrl: reviewDataUrl, source: "camera" },
    }));
    setAnalysis(null);
    setIsRefined(false);
    setAnalysisError("");
    setReviewDataUrl(null);

    if (activeStepIndex < CAPTURE_STEPS.length - 1) {
      setActiveStepIndex((index) => index + 1);
    } else {
      closeCapture();
    }
  };

  const retakePhoto = () => {
    setReviewDataUrl(null);
    setCameraError("");
  };

  const handleGalleryPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    try {
      const dataUrl = await compressFile(file);
      setPhotos((current) => ({
        ...current,
        [activeStep.id]: { dataUrl, source: "gallery" },
      }));
      setAnalysis(null);
      setIsRefined(false);
      setAnalysisError("");

      if (cameraOpen && activeStepIndex < CAPTURE_STEPS.length - 1) {
        setActiveStepIndex((index) => index + 1);
      } else if (cameraOpen) {
        closeCapture();
      }
    } catch {
      setCameraError("Impossible de préparer cette image.");
    }
  };

  const removePhoto = (id: PSAPhotoId) => {
    setPhotos((current) => ({ ...current, [id]: null }));
    setAnalysis(null);
    setIsRefined(false);
    setAnalysisError("");
  };

  const resetAll = () => {
    closeCapture();
    setPhotos(EMPTY_PHOTOS);
    setAnalysis(null);
    setIsRefined(false);
    setManualReview({
      surfaceMarks: "none",
      cornerWear: "none",
      edgeWhitening: "none",
      printLine: "none",
      indentation: "none",
      creaseOrMajorDefect: false,
    });
    setPremiumControlsOpen(false);
    setAnalysisError("");
    setActiveStepIndex(0);
  };

  const requestAnalysis = async (review?: PSAManualReview) => {
    if (!isComplete || isAnalyzing || isRefining) return;

    review ? setIsRefining(true) : setIsAnalyzing(true);
    setAnalysisError("");
    if (!review) setAnalysis(null);

    try {
      const response = await fetch("/api/psa-grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: CAPTURE_STEPS.map((step) => ({
            id: step.id,
            imageBase64: photos[step.id]!.dataUrl,
          })),
          manualReview: review,
          previousAnalysis: review ? analysis : undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Analyse impossible.");
      }

      setAnalysis(payload.data as PSAGradeAnalysis);
      setIsRefined(Boolean(review));
    } catch (error: any) {
      setAnalysisError(error?.message || "Impossible d'analyser les photos.");
    } finally {
      setIsAnalyzing(false);
      setIsRefining(false);
    }
  };

  const analyzePhotos = () => requestAnalysis();
  const refineAnalysis = () => requestAnalysis(manualReview);


  const estimateLabel = analysis
    ? !analysis.photoQuality.acceptable
      ? "Photos à reprendre"
      : analysis.estimate.recommended
      ? `PSA ${analysis.estimate.recommended}`
      : `PSA ${analysis.estimate.minimum}–${analysis.estimate.maximum}`
    : "";

  return (
    <div className="space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleGalleryPhoto}
      />

      <section className="kt-premium-panel overflow-hidden rounded-[24px]">
        <div className="border-b border-white/[0.07] bg-[linear-gradient(135deg,rgba(37,99,235,0.13),rgba(17,24,39,0.54))] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-300">
                <ScanLine className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                  Caméra PSA guidée
                </p>
                <h2 className="mt-1 text-base font-black text-white sm:text-lg">
                  4 vues, une analyse Gemini
                </h2>
                <p className="mt-1 max-w-2xl text-[11px] leading-5 text-zinc-400">
                  Le cadre vous guide automatiquement : face, dos puis deux vues inclinées pour révéler les défauts de surface.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-white/[0.08] bg-black/25 px-3 py-2">
              <span className="text-xs font-black text-white">{completedCount}/4</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-500">
                vues validées
              </span>
            </div>
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/35">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-[width] duration-300"
              style={{ width: `${(completedCount / CAPTURE_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-4 gap-2">
            {CAPTURE_STEPS.map((step, index) => {
              const photo = photos[step.id];
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => openCapture(index)}
                  className={`group relative overflow-hidden rounded-[16px] border text-left transition active:scale-[0.98] ${
                    photo
                      ? "border-blue-300/25 bg-blue-400/[0.07]"
                      : "border-white/[0.08] bg-[#171b22] hover:border-white/[0.16]"
                  }`}
                >
                  <div className="relative aspect-[63/88] w-full overflow-hidden bg-black/25">
                    {photo ? (
                      <img
                        src={photo.dataUrl}
                        alt={step.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Camera className="h-5 w-5 text-zinc-600" />
                      </div>
                    )}
                    <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-black/70 text-[10px] font-black text-white">
                      {index + 1}
                    </span>
                    {photo ? (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[#06120d]">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                  </div>
                  <div className="px-2 py-2">
                    <p className="truncate text-[10px] font-black text-white">{step.shortTitle}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">{photo ? "Reprendre" : "À capturer"}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => openCapture()}
              className="kt-premium-button flex flex-1 items-center justify-center gap-2 py-3 text-xs uppercase"
            >
              <Camera className="h-4 w-4" />
              {completedCount ? "Continuer les photos" : "Ouvrir la caméra"}
            </button>

            <button
              type="button"
              onClick={analyzePhotos}
              disabled={!isComplete || isAnalyzing}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-400/[0.10] px-4 py-3 text-xs font-black uppercase tracking-wider text-violet-200 transition hover:bg-violet-400/[0.15] disabled:cursor-not-allowed disabled:opacity-35"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isAnalyzing ? "Analyse Gemini…" : "Estimer le grade"}
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300/12 bg-amber-400/[0.05] px-3 py-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-[10px] leading-4 text-zinc-400">
              Sortez la carte de sa sleeve, utilisez une lumière diffuse et évitez le flash. L’estimation est visuelle, non officielle et sans affiliation avec PSA.
            </p>
          </div>
        </div>
      </section>

      {analysisError ? (
        <section className="rounded-[18px] border border-rose-400/20 bg-rose-400/[0.06] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <div className="min-w-0">
              <p className="text-xs font-black text-rose-200">Analyse interrompue</p>
              <p className="mt-1 text-[10px] leading-4 text-zinc-400">{analysisError}</p>
              <button
                type="button"
                onClick={analyzePhotos}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/[0.08] px-3 py-2 text-[10px] font-black text-rose-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Réessayer
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {analysis ? (
        <section className="space-y-4">
          <div
            className={`overflow-hidden rounded-[24px] border ${
              analysis.photoQuality.acceptable
                ? "border-blue-300/18 bg-[#151a22]"
                : "border-amber-300/20 bg-amber-400/[0.045]"
            }`}
          >
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Estimation King_TCG
                  </p>
                  <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
                    {estimateLabel}
                  </h3>
                  <p className="mt-2 max-w-xl text-[11px] leading-5 text-zinc-400">
                    {analysis.summary}
                  </p>
                  {isRefined ? (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em] text-violet-200">
                      <ClipboardCheck className="h-3 w-3" />
                      Estimation affinée avec les contrôles supplémentaires
                    </span>
                  ) : null}
                </div>

                <div className="min-w-[150px] rounded-[18px] border border-white/[0.08] bg-black/25 p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-500">Confiance</p>
                  <p className="mt-1 text-2xl font-black text-blue-300">{Math.min(99.9, analysis.confidence).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${Math.min(99.9, analysis.confidence)}%` }}
                    />
                  </div>
                </div>
              </div>

              {!analysis.photoQuality.acceptable ? (
                <div className="mt-4 rounded-2xl border border-amber-300/18 bg-amber-400/[0.06] p-3">
                  <p className="text-[10px] font-black text-amber-200">
                    Qualité photo insuffisante ({analysis.photoQuality.score}/100)
                  </p>
                  <ul className="mt-2 space-y-1 text-[10px] leading-4 text-zinc-400">
                    {analysis.photoQuality.issues.map((issue) => (
                      <li key={issue}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CRITERIA.map((criterion) => {
              const value = analysis.criteria[criterion.key];
              return (
                <article
                  key={criterion.key}
                  className={`rounded-[18px] border p-4 ${scoreTone(value.score)}`}
                >
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.11em] opacity-75">
                        {criterion.label}
                      </p>
                      <p className="mt-1 text-xs font-black text-white">{value.label}</p>
                    </div>
                    <p className="text-xl font-black tabular-nums">{value.score}<span className="text-[10px] opacity-60">/10</span></p>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
                    <div className="h-full rounded-full bg-current" style={{ width: `${value.score * 10}%` }} />
                  </div>
                  {value.observations[0] ? (
                    <p className="mt-2 text-[10px] leading-4 text-zinc-400">{value.observations[0]}</p>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="kt-premium-panel rounded-[18px] p-5">
              <h4 className="text-xs font-black text-white">Défauts visibles</h4>
              {analysis.defects.length ? (
                <div className="mt-3 space-y-2">
                  {analysis.defects.map((defect, index) => (
                    <div key={`${defect.description}-${index}`} className="rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-400">{defect.area}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                          defect.severity === "importante"
                            ? "bg-rose-400/10 text-rose-300"
                            : defect.severity === "moderee"
                            ? "bg-amber-400/10 text-amber-300"
                            : "bg-blue-400/10 text-blue-300"
                        }`}>
                          {defect.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] leading-4 text-zinc-400">{defect.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[10px] leading-4 text-zinc-500">Aucun défaut évident signalé sur les photographies fournies.</p>
              )}
            </article>

            <article className="kt-premium-panel rounded-[18px] p-5">
              <h4 className="text-xs font-black text-white">Recommandations</h4>
              <div className="mt-3 space-y-2">
                {analysis.recommendations.length ? (
                  analysis.recommendations.map((recommendation) => (
                    <div key={recommendation} className="flex items-start gap-2 text-[10px] leading-4 text-zinc-400">
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-300" />
                      <span>{recommendation}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] leading-4 text-zinc-500">Aucune recommandation complémentaire.</p>
                )}
              </div>
            </article>
          </div>

          {analysis.photoQuality.acceptable ? (
            <article className="kt-premium-panel overflow-hidden rounded-[18px]">
              <button
                type="button"
                onClick={() => setPremiumControlsOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 p-5 text-left transition hover:bg-white/[0.025]"
                aria-expanded={premiumControlsOpen}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-black text-white">Contrôles supplémentaires</h4>
                    <span className="inline-flex items-center rounded-full border border-violet-300/25 bg-violet-400/[0.10] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-200">👑 Premium</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-400">
                    Confirmez les micro-défauts difficiles à juger sur photo pour affiner l'estimation IA.
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-violet-200 transition ${premiumControlsOpen ? "rotate-180" : ""}`} />
              </button>

              {premiumControlsOpen ? (
                <div className="border-t border-white/[0.06] px-5 pb-5 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ManualSelect label="Surface sous lumière rasante" value={manualReview.surfaceMarks} onChange={(value) => setManualReview((current) => ({ ...current, surfaceMarks: value as PSAManualReview["surfaceMarks"] }))} options={[["none", "Aucune marque"], ["micro", "Micro-marques"], ["visible", "Rayures visibles"], ["deep", "Rayure profonde"]]} />
                    <ManualSelect label="Usure des coins" value={manualReview.cornerWear} onChange={(value) => setManualReview((current) => ({ ...current, cornerWear: value as PSAManualReview["cornerWear"] }))} options={[["none", "Aucune"], ["light", "Très légère"], ["one_marked", "Un coin marqué"], ["multiple", "Plusieurs coins"]]} />
                    <ManualSelect label="Blanchiment des bords" value={manualReview.edgeWhitening} onChange={(value) => setManualReview((current) => ({ ...current, edgeWhitening: value as PSAManualReview["edgeWhitening"] }))} options={[["none", "Aucun"], ["few_points", "Quelques points blancs"], ["light", "Léger"], ["marked", "Marqué"]]} />
                    <ManualSelect label="Ligne d'impression / holo" value={manualReview.printLine} onChange={(value) => setManualReview((current) => ({ ...current, printLine: value as PSAManualReview["printLine"] }))} options={[["none", "Aucune"], ["fine", "Fine / discrète"], ["visible", "Clairement visible"]]} />
                    <ManualSelect label="Enfoncement / marque de pression" value={manualReview.indentation} onChange={(value) => setManualReview((current) => ({ ...current, indentation: value as PSAManualReview["indentation"] }))} options={[["none", "Aucun"], ["light", "Très léger"], ["visible", "Visible"]]} />
                  </div>

                  <div className="mt-3">
                    <ManualToggle label="Pli, déchirure ou défaut structurel majeur" checked={manualReview.creaseOrMajorDefect} onChange={(checked) => setManualReview((current) => ({ ...current, creaseOrMajorDefect: checked }))} />
                  </div>

                  <button
                    type="button"
                    onClick={refineAnalysis}
                    disabled={isRefining}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-300/25 bg-violet-400/[0.11] px-4 py-3 text-xs font-black text-violet-100 transition hover:bg-violet-400/[0.16] disabled:opacity-50"
                  >
                    {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                    {isRefining ? "Affinage Gemini…" : "Affiner l'estimation"}
                  </button>
                </div>
              ) : null}
            </article>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => openCapture(0)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-xs font-black text-white transition hover:bg-white/[0.07]"
            >
              <Camera className="h-4 w-4" />
              Reprendre les photos
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.09] bg-black/20 px-4 py-3 text-xs font-black text-zinc-300 transition hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Nouvelle estimation
            </button>
          </div>

          <p className="px-2 text-center text-[10px] leading-4 text-zinc-600">
            {analysis.disclaimer}
          </p>
        </section>
      ) : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-[100] bg-black">
          <div className="relative mx-auto h-full w-full max-w-xl overflow-hidden bg-black">
            {reviewDataUrl ? (
              <img src={reviewDataUrl} alt="Photo capturée" className="h-full w-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.62),transparent_24%,transparent_72%,rgba(0,0,0,.88))]" />

            <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={closeCapture}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-xl"
                aria-label="Fermer la caméra"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1 rounded-2xl border border-white/12 bg-black/55 px-4 py-3 text-center backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
                  Étape {activeStepIndex + 1} sur 4
                </p>
                <p className="mt-0.5 text-sm font-black text-white">{activeStep.title}</p>
                <p className="mt-1 text-[10px] leading-4 text-zinc-300">{activeStep.description}</p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-xl"
                aria-label="Importer depuis la galerie"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            </div>

            {!reviewDataUrl ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 aspect-[63/88] w-[72%] max-w-[330px] -translate-x-1/2 -translate-y-1/2">
                <div
                  className={`absolute inset-0 rounded-[24px] border-2 border-blue-300/85 shadow-[0_0_0_999px_rgba(0,0,0,.24),0_0_34px_rgba(96,165,250,.24)] ${
                    activeStep.tilted ? "rotate-[4deg]" : ""
                  }`}
                />
                {[
                  "left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl",
                  "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl",
                  "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
                  "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
                ].map((className) => (
                  <span key={className} className={`absolute h-10 w-10 border-blue-200 ${className}`} />
                ))}
                <span className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/12 bg-black/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-white backdrop-blur-xl">
                  {activeStep.overlayLabel}
                </span>
              </div>
            ) : null}

            {cameraError ? (
              <div className="absolute left-4 right-4 top-1/2 z-30 -translate-y-1/2 rounded-[18px] border border-rose-300/25 bg-[#15171c]/95 p-5 text-center backdrop-blur-xl">
                <CameraOff className="mx-auto h-7 w-7 text-rose-300" />
                <p className="mt-3 text-xs font-black text-white">Caméra indisponible</p>
                <p className="mt-2 text-[10px] leading-4 text-zinc-400">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-[10px] font-black text-white"
                >
                  <ImagePlus className="h-4 w-4" />
                  Choisir une photo
                </button>
              </div>
            ) : null}

            <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="mb-4 rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-center backdrop-blur-xl">
                <div className="flex items-start justify-center gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-200" />
                  <p className="text-[10px] leading-4 text-zinc-300">{activeStep.hint}</p>
                </div>
              </div>

              {reviewDataUrl ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3.5 text-xs font-black text-white backdrop-blur-xl"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reprendre
                  </button>
                  <button
                    type="button"
                    onClick={validateCurrentPhoto}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3.5 text-xs font-black text-white shadow-[0_12px_35px_rgba(37,99,235,.35)]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Valider
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={!cameraReady || Boolean(cameraError)}
                    className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[5px] border-white bg-white/20 shadow-[0_0_0_5px_rgba(255,255,255,.15)] transition active:scale-95 disabled:opacity-35"
                    aria-label="Prendre la photo"
                  >
                    <span className="h-[56px] w-[56px] rounded-full bg-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


function ManualSelect({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <label className="rounded-2xl border border-white/[0.07] bg-black/20 p-3">
      <span className="block text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#11151b] px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-violet-300/35">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function ManualToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex min-h-[48px] items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${checked ? "border-rose-300/25 bg-rose-400/[0.08] text-rose-100" : "border-white/[0.07] bg-black/20 text-zinc-300"}`}>
      <span className="text-[10px] font-bold leading-4">{label}</span>
      <span className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${checked ? "bg-rose-400" : "bg-zinc-700"}`}><span className={`h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} /></span>
    </button>
  );
}
