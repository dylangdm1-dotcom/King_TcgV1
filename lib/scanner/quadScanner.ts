// components/scanner/QuadScannerModal.tsx

"use client";

import { useState } from "react";
import { X, Grid, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import {
  createQuadScanSession,
  processQuadScan,
  updateQuadSlotResult,
  type QuadScanSession,
  type QuadSlotIndex,
} from "@/lib/scanner/quadScanner";
import type { PokemonCard } from "@/lib/types";

interface QuadScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardsIdentified: (cards: PokemonCard[]) => void;
  identifyCardByImage: (imageBase64: string) => Promise<PokemonCard | null>;
}

export default function QuadScannerModal({
  isOpen,
  onClose,
  onCardsIdentified,
  identifyCardByImage,
}: QuadScannerModalProps) {
  const [step, setStep] = useState<"upload" | "processing" | "results">("upload");
  const [session, setSession] = useState<QuadScanSession | null>(null);
  const [identifiedCardsMap, setIdentifiedCardsMap] = useState<Record<number, PokemonCard>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setGlobalError(null);
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64Image = reader.result as string;
        const newSession = createQuadScanSession(base64Image);
        setSession(newSession);
        setStep("processing");

        // 1. Découpage des 4 quadrants via canvas
        const processedSession = await processQuadScan(newSession);
        setSession(processedSession);

        const cardsMap: Record<number, PokemonCard> = {};

        // 2. Analyse séquentielle ou parallèle par l'IA de chaque quadrant
        for (const slotItem of processedSession.slots) {
          if (!slotItem.croppedImageUri) continue;

          try {
            const card = await identifyCardByImage(slotItem.croppedImageUri);
            if (card) {
              cardsMap[slotItem.slot] = card;
              setSession((prev) =>
                prev ? updateQuadSlotResult(prev, slotItem.slot, card.id, true) : prev
              );
            } else {
              setSession((prev) =>
                prev ? updateQuadSlotResult(prev, slotItem.slot, "", false, "Carte non reconnue") : prev
              );
            }
          } catch (err) {
            setSession((prev) =>
              prev ? updateQuadSlotResult(prev, slotItem.slot, "", false, "Erreur API") : prev
            );
          }
        }

        setIdentifiedCardsMap(cardsMap);
        setStep("results");
      } catch (err) {
        console.error("Erreur lors du traitement du Quad Scan", err);
        setGlobalError("Impossible de traiter l'image globale.");
        setStep("upload");
      }
    };

    reader.onerror = () => {
      setGlobalError("Erreur de lecture du fichier.");
    };

    reader.readAsDataURL(file);
  }

  function handleValidateAll() {
    const validCards = Object.values(identifiedCardsMap);
    onCardsIdentified(validCards);
    handleReset();
  }

  function handleReset() {
    setStep("upload");
    setSession(null);
    setIdentifiedCardsMap({});
    setGlobalError(null);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => {
            handleReset();
            onClose();
          }}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase text-white">Scan Groupé (4 Cartes)</h2>
            <p className="text-xs text-zinc-400">Optimisez vos ajouts en scannant une grille 2x2.</p>
          </div>
        </div>

        {globalError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{globalError}</span>
          </div>
        )}

        {/* STEP 1 : UPLOAD */}
        {step === "upload" && (
          <div className="border-2 border-dashed border-zinc-700 hover:border-cyan-500 transition rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 bg-black/40">
            <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-white uppercase">Prendre ou importer une photo de groupe</p>
              <p className="text-[10px] text-zinc-500">Disposez vos 4 cartes bien à plat dans le champ</p>
            </div>

            <label className="mt-2 cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase px-5 py-3 rounded-xl transition shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2">
              <span>Sélectionner / Photographier</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={FileSelected => handleFileSelected(FileSelected as any)}
              />
            </label>
          </div>
        )}

        {/* STEP 2 : PROCESSING */}
        {step === "processing" && session && (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-4">
              <div className="inline-block w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black uppercase text-cyan-400 tracking-wider">
                Analyse IA des quadrants en cours...
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {session.slots.map((slot) => (
                <div
                  key={slot.slot}
                  className="p-3 bg-black/60 border border-zinc-800 rounded-xl flex items-center gap-3"
                >
                  {slot.croppedImageUri ? (
                    <img
                      src={slot.croppedImageUri}
                      alt={slot.label}
                      className="w-10 h-14 object-cover rounded border border-zinc-700"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-zinc-800 rounded animate-pulse" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase text-zinc-400">{slot.label}</p>
                    <p className="text-xs font-bold text-white mt-0.5 truncate">
                      {slot.status === "processing" && "Analyse..."}
                      {slot.status === "success" && "Trouvé !"}
                      {slot.status === "error" && "Échec"}
                      {slot.status === "empty" && "En attente"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 : RESULTS */}
        {step === "results" && session && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Résultats ({Object.keys(identifiedCardsMap).length}/4 identifiées)
              </span>
              <button
                onClick={handleReset}
                className="text-[10px] font-bold text-cyan-400 hover:underline uppercase"
              >
                Recommencer
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {session.slots.map((slot) => {
                const card = identifiedCardsMap[slot.slot];
                return (
                  <div
                    key={slot.slot}
                    className="p-3 bg-black/60 border border-zinc-800 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {slot.croppedImageUri && (
                        <img
                          src={slot.croppedImageUri}
                          alt={slot.label}
                          className="w-8 h-11 object-cover rounded border border-zinc-700 flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-zinc-500">{slot.label}</p>
                        <p className="text-xs font-black text-white truncate">
                          {card ? card.name : "Non identifiée"}
                        </p>
                        {card && (
                          <p className="text-[10px] text-cyan-400 font-medium truncate">
                            N° {card.number || "---"} {card.rarity ? `• ${card.rarity}` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      {card ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleValidateAll}
              disabled={Object.keys(identifiedCardsMap).length === 0}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase py-3.5 rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>Valider et importer les cartes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
