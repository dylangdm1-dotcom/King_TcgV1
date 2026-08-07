"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Info,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

type PhotoSlotId = "front" | "back" | "frontAngle" | "backAngle";

type PhotoEntry = {
  file: File;
  url: string;
};

type PhotoSlot = {
  id: PhotoSlotId;
  step: string;
  title: string;
  description: string;
  hint: string;
};

const PHOTO_SLOTS: PhotoSlot[] = [
  {
    id: "front",
    step: "01",
    title: "Face avant",
    description: "Carte entière, parfaitement droite et sans reflet.",
    hint: "Permet d'analyser le centrage et la surface avant.",
  },
  {
    id: "back",
    step: "02",
    title: "Face arrière",
    description: "Dos complet, coins visibles et éclairage uniforme.",
    hint: "Permet d'analyser le centrage, les bords et le dos.",
  },
  {
    id: "frontAngle",
    step: "03",
    title: "Angle avant",
    description: "Inclinez légèrement la carte sous une lumière diffuse.",
    hint: "Aide à révéler rayures, plis et défauts de surface.",
  },
  {
    id: "backAngle",
    step: "04",
    title: "Angle arrière",
    description: "Montrez les quatre coins et les tranches de la carte.",
    hint: "Aide à contrôler l'usure des coins et des bords.",
  },
];

const EMPTY_PHOTOS: Record<PhotoSlotId, PhotoEntry | null> = {
  front: null,
  back: null,
  frontAngle: null,
  backAngle: null,
};

export default function PSAGradeCapture() {
  const [photos, setPhotos] = useState<Record<PhotoSlotId, PhotoEntry | null>>(
    EMPTY_PHOTOS
  );
  const photosRef = useRef(photos);
  const inputRefs = useRef<Record<PhotoSlotId, HTMLInputElement | null>>({
    front: null,
    back: null,
    frontAngle: null,
    backAngle: null,
  });

  const completedCount = useMemo(
    () => Object.values(photos).filter(Boolean).length,
    [photos]
  );
  const isComplete = completedCount === PHOTO_SLOTS.length;

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      Object.values(photosRef.current).forEach((entry) => {
        if (entry) URL.revokeObjectURL(entry.url);
      });
    };
  }, []);

  const handlePhotoChange = (
    slotId: PhotoSlotId,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    setPhotos((current) => {
      const previous = current[slotId];
      if (previous) URL.revokeObjectURL(previous.url);

      return {
        ...current,
        [slotId]: {
          file,
          url: URL.createObjectURL(file),
        },
      };
    });
  };

  const removePhoto = (slotId: PhotoSlotId) => {
    setPhotos((current) => {
      const previous = current[slotId];
      if (previous) URL.revokeObjectURL(previous.url);

      return {
        ...current,
        [slotId]: null,
      };
    });

    const input = inputRefs.current[slotId];
    if (input) input.value = "";
  };

  const resetPhotos = () => {
    Object.values(photos).forEach((entry) => {
      if (entry) URL.revokeObjectURL(entry.url);
    });

    setPhotos(EMPTY_PHOTOS);
    Object.values(inputRefs.current).forEach((input) => {
      if (input) input.value = "";
    });
  };

  return (
    <div className="space-y-5">
      <section className="kt-premium-panel overflow-hidden rounded-[24px]">
        <div className="border-b border-white/[0.07] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(17,24,39,0.5))] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-300">
                <ScanLine className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                  Parcours d'estimation
                </p>
                <h2 className="mt-1 text-base font-black text-white sm:text-lg">
                  Préparez 4 photos complémentaires
                </h2>
                <p className="mt-1 max-w-2xl text-[11px] leading-5 text-zinc-400">
                  Chaque vue contrôle un critère différent. Les images restent locales
                  pendant cette première étape et ne sont pas encore envoyées à une IA.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-white/[0.08] bg-black/25 px-3 py-2">
              <span className="text-xs font-black text-white">{completedCount}/4</span>
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                photos prêtes
              </span>
            </div>
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/35">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-[width] duration-300"
              style={{ width: `${(completedCount / PHOTO_SLOTS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {PHOTO_SLOTS.map((slot) => {
            const photo = photos[slot.id];

            return (
              <article
                key={slot.id}
                className={`relative overflow-hidden rounded-[20px] border p-3.5 transition duration-200 ${
                  photo
                    ? "border-blue-300/25 bg-blue-400/[0.06]"
                    : "border-white/[0.08] bg-[#171b22] hover:border-white/[0.15]"
                }`}
              >
                <input
                  ref={(element) => {
                    inputRefs.current[slot.id] = element;
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => handlePhotoChange(slot.id, event)}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/25 text-[10px] font-black text-blue-300">
                      {slot.step}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-white">{slot.title}</h3>
                      <p className="mt-1 text-[10px] leading-4 text-zinc-500">
                        {slot.description}
                      </p>
                    </div>
                  </div>

                  {photo ? (
                    <button
                      type="button"
                      onClick={() => removePhoto(slot.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-red-300 transition hover:bg-red-400/15"
                      aria-label={`Supprimer la photo ${slot.title}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => inputRefs.current[slot.id]?.click()}
                  className="mt-3 block w-full overflow-hidden rounded-[16px] border border-dashed border-white/[0.10] bg-black/20 text-left transition hover:border-blue-300/30 hover:bg-blue-400/[0.04]"
                >
                  {photo ? (
                    <div className="relative aspect-[16/10] w-full">
                      <img
                        src={photo.url}
                        alt={`Aperçu ${slot.title}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2.5 pt-8">
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-white">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                          Photo ajoutée
                        </span>
                        <span className="text-[9px] font-bold text-blue-200">
                          Remplacer
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex aspect-[16/10] flex-col items-center justify-center px-4 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-zinc-400">
                        <Camera className="h-5 w-5" />
                      </div>
                      <span className="mt-2 text-[10px] font-black uppercase tracking-wider text-zinc-300">
                        Prendre ou choisir une photo
                      </span>
                      <span className="mt-1 text-[9px] leading-4 text-zinc-600">
                        JPG, PNG ou photo depuis le téléphone
                      </span>
                    </div>
                  )}
                </button>

                <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-black/20 px-2.5 py-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-300" />
                  <p className="text-[9px] leading-4 text-zinc-500">{slot.hint}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="kt-premium-panel rounded-[20px] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] text-emerald-300">
              <ImagePlus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                Qualité recommandée
              </p>
              <ul className="mt-2 space-y-1.5 text-[10px] leading-4 text-zinc-400">
                <li>• Carte sortie de la sleeve et posée sur un fond uni.</li>
                <li>• Lumière diffuse, sans flash direct ni reflet.</li>
                <li>• Image nette, carte entière et coins non coupés.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="kt-premium-panel rounded-[20px] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-400/[0.07] text-amber-300">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                Estimation non officielle
              </p>
              <p className="mt-2 text-[10px] leading-4 text-zinc-400">
                La future analyse donnera une plage probable et des critères visibles.
                Elle ne remplacera jamais une certification PSA réalisée en personne.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="kt-premium-panel rounded-[22px] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
              Étape suivante
            </p>
            <h3 className="mt-1 text-sm font-black text-white">
              Vérification puis analyse IA structurée
            </h3>
            <p className="mt-1 text-[10px] leading-4 text-zinc-500">
              Le moteur d'analyse sera branché au prochain sprint. Aucun résultat fictif
              n'est généré dans cette version.
            </p>
          </div>

          <div className="flex gap-2">
            {completedCount > 0 ? (
              <button
                type="button"
                onClick={resetPhotos}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase text-zinc-300 transition hover:bg-white/[0.07]"
              >
                <RotateCcw className="h-4 w-4" />
                Recommencer
              </button>
            ) : null}

            <button
              type="button"
              disabled={!isComplete}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[10px] font-black uppercase transition ${
                isComplete
                  ? "bg-blue-500 text-white shadow-[0_12px_30px_rgba(59,130,246,0.22)] hover:bg-blue-400"
                  : "cursor-not-allowed border border-white/[0.06] bg-white/[0.03] text-zinc-600"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {isComplete ? "Photos prêtes" : `Ajouter ${4 - completedCount} photo${4 - completedCount > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
