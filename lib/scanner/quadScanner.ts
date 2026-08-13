// lib/scanner/quadScanner.ts

import type { PokemonCard } from "@/lib/types";
import { QUAD_FRAMES } from "@/lib/scanner/quadLayout";

export type QuadSlotIndex = 0 | 1 | 2 | 3;

export type QuadScanItem = {
  slot: QuadSlotIndex;
  label: string;
  croppedImageUri: string | null;
  status: "empty" | "processing" | "success" | "error";
  cardId?: string;
  errorMsg?: string;
};

export type QuadScanSession = {
  id: string;
  sourceImageUri: string;
  createdAt: string;
  slots: QuadScanItem[];
};

export function createQuadScanSession(sourceImageUri: string): QuadScanSession {
  return {
    id: `quad_${Date.now()}`,
    sourceImageUri,
    createdAt: new Date().toISOString(),
    slots: [
      { slot: 0, label: "Haut - Gauche", croppedImageUri: null, status: "empty" },
      { slot: 1, label: "Haut - Droite", croppedImageUri: null, status: "empty" },
      { slot: 2, label: "Bas - Gauche", croppedImageUri: null, status: "empty" },
      { slot: 3, label: "Bas - Droite", croppedImageUri: null, status: "empty" },
    ],
  };
}

export async function cropQuadImage(sourceImageUri: string, slot: QuadSlotIndex): Promise<string> {
  if (typeof window === "undefined") return sourceImageUri;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Impossible d'initialiser le contexte canvas"));
        return;
      }

      const frame = QUAD_FRAMES.find((item) => item.slot === slot);
      if (!frame) {
        reject(new Error("Zone Quad inconnue"));
        return;
      }

      const sx = Math.round(img.width * frame.x);
      const sy = Math.round(img.height * frame.y);
      const sw = Math.round(img.width * frame.width);
      const sh = Math.round(img.height * frame.height);

      // On conserve un crop assez grand pour que Gemini lise le numéro et le symbole,
      // sans envoyer tout le fond autour de la carte.
      const maxWidth = 720;
      const scale = sw > maxWidth ? maxWidth / sw : 1;
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.90));
    };

    img.onerror = (err) => reject(err);
    img.src = sourceImageUri;
  });
}

export async function processQuadScan(session: QuadScanSession): Promise<QuadScanSession> {
  const updatedSlots = await Promise.all(
    session.slots.map(async (slotItem) => {
      try {
        const croppedUri = await cropQuadImage(session.sourceImageUri, slotItem.slot);
        return {
          ...slotItem,
          croppedImageUri: croppedUri,
          status: "processing" as const,
        };
      } catch {
        return {
          ...slotItem,
          status: "error" as const,
          errorMsg: "Échec du découpage du quadrant",
        };
      }
    })
  );

  return {
    ...session,
    slots: updatedSlots,
  };
}

export function updateQuadSlotResult(
  session: QuadScanSession,
  slot: QuadSlotIndex,
  cardId: string,
  success: boolean,
  errorMsg?: string
): QuadScanSession {
  const updatedSlots = session.slots.map((item) => {
    if (item.slot === slot) {
      return {
        ...item,
        status: success ? ("success" as const) : ("error" as const),
        cardId: success ? cardId : undefined,
        errorMsg: errorMsg,
      };
    }
    return item;
  });

  return {
    ...session,
    slots: updatedSlots,
  };
}