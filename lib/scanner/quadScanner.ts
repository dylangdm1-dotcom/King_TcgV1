// lib/scanner/quadScanner.ts

export type QuadSlotIndex = 0 | 1 | 2 | 3; // Haut-Gauche, Haut-Droite, Bas-Gauche, Bas-Droite

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

/**
 * Initialise une session de scan groupé de 4 cartes à partir d'une photo globale
 */
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

/**
 * Découpe virtuellement l'image source en 4 quadrants (Grille 2x2) via un canvas HTML5
 * pour extraire chaque carte individuellement avant l'envoi à l'IA.
 */
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

      const halfWidth = img.width / 2;
      const halfHeight = img.height / 2;

      canvas.width = halfWidth;
      canvas.height = halfHeight;

      let sx = 0;
      let sy = 0;

      switch (slot) {
        case 0: // Haut-Gauche
          sx = 0; sy = 0;
          break;
        case 1: // Haut-Droite
          sx = halfWidth; sy = 0;
          break;
        case 2: // Bas-Gauche
          sx = 0; sy = halfHeight;
          break;
        case 3: // Bas-Droite
          sx = halfWidth; sy = halfHeight;
          break;
      }

      // Dessin du quart de l'image correspondante
      ctx.drawImage(img, sx, sy, halfWidth, halfHeight, 0, 0, halfWidth, halfHeight);

      resolve(canvas.toDataURL("image/jpeg", 0.90));
    };

    img.onerror = (err) => reject(err);
    img.src = sourceImageUri;
  });
}

/**
 * Prépare et découpe automatiquement les 4 quadrants d'une photo de groupe
 */
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
      } catch (err) {
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

/**
 * Met à jour le statut d'un quadrant spécifique après analyse par l'IA
 */
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
