// lib/scanner/quadScanner.ts

/**
 * 🧩 King_TCG Scanner V5.0
 *
 * Scanner quadruple :
 * - découpe une image en 4 quadrants
 * - prépare chaque quadrant pour Gemini Vision V5
 * - suit l'état de traitement de chaque carte
 *
 * Quadrants :
 *
 *   ┌─────────────┬─────────────┐
 *   │      0      │      1      │
 *   │ Haut-Gauche │ Haut-Droite │
 *   ├─────────────┼─────────────┤
 *   │      2      │      3      │
 *   │ Bas-Gauche  │ Bas-Droite  │
 *   └─────────────┴─────────────┘
 */

export type QuadSlotIndex = 0 | 1 | 2 | 3;

export type QuadScanStatus =
  | "empty"
  | "processing"
  | "success"
  | "error";

export type QuadScanItem = {
  slot: QuadSlotIndex;
  label: string;
  croppedImageUri: string | null;
  status: QuadScanStatus;
  cardId?: string;
  errorMsg?: string;
};

export type QuadScanSession = {
  id: string;
  sourceImageUri: string;
  createdAt: string;
  slots: QuadScanItem[];
};

const JPEG_QUALITY = 0.9;

const QUAD_LABELS: Record<QuadSlotIndex, string> = {
  0: "Haut - Gauche",
  1: "Haut - Droite",
  2: "Bas - Gauche",
  3: "Bas - Droite",
};

/**
 * Crée une nouvelle session de scan quadruple.
 */
export function createQuadScanSession(
  sourceImageUri: string
): QuadScanSession {
  return {
    id: `quad_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    sourceImageUri,

    createdAt: new Date().toISOString(),

    slots: [0, 1, 2, 3].map((slot) => ({
      slot: slot as QuadSlotIndex,
      label: QUAD_LABELS[slot as QuadSlotIndex],
      croppedImageUri: null,
      status: "empty",
    })),
  };
}

/**
 * Découpe l'image source en quatre quadrants.
 *
 * Cette fonction prépare uniquement les images.
 * La reconnaissance de la carte est effectuée ensuite
 * par le pipeline Scanner / Gemini Vision V5.
 */
export async function cropQuadImage(
  sourceImageUri: string,
  slot: QuadSlotIndex
): Promise<string> {
  if (!sourceImageUri) {
    throw new Error("Image source manquante.");
  }

  if (typeof window === "undefined") {
    throw new Error(
      "Le découpage quadruple nécessite un environnement navigateur."
    );
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        if (img.width <= 0 || img.height <= 0) {
          reject(
            new Error(
              "Dimensions de l'image source invalides."
            )
          );
          return;
        }

        const halfWidth = img.width / 2;
        const halfHeight = img.height / 2;

        const sx = slot % 2 === 0 ? 0 : halfWidth;
        const sy = slot < 2 ? 0 : halfHeight;

        /**
         * Utilisation de valeurs entières pour éviter
         * les problèmes de rendu liés aux dimensions impaires.
         */
        const sourceX = Math.floor(sx);
        const sourceY = Math.floor(sy);

        const sourceWidth =
          slot % 2 === 0
            ? Math.ceil(halfWidth)
            : img.width - sourceX;

        const sourceHeight =
          slot < 2
            ? Math.ceil(halfHeight)
            : img.height - sourceY;

        if (
          sourceWidth <= 0 ||
          sourceHeight <= 0
        ) {
          reject(
            new Error(
              "Dimensions du quadrant invalides."
            )
          );
          return;
        }

        const canvas = document.createElement("canvas");

        canvas.width = sourceWidth;
        canvas.height = sourceHeight;

        const ctx = canvas.getContext("2d", {
          alpha: false,
        });

        if (!ctx) {
          reject(
            new Error(
              "Impossible d'initialiser le contexte canvas."
            )
          );
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          sourceWidth,
          sourceHeight
        );

        const result = canvas.toDataURL(
          "image/jpeg",
          JPEG_QUALITY
        );

        if (!result) {
          reject(
            new Error(
              "Impossible de générer l'image du quadrant."
            )
          );
          return;
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(
        new Error(
          "Impossible de charger l'image source."
        )
      );
    };

    img.src = sourceImageUri;
  });
}

/**
 * Découpe les quatre quadrants d'une session.
 *
 * Les quadrants correctement générés passent en
 * "processing" afin d'indiquer qu'ils sont prêts
 * pour l'analyse Gemini Vision V5.
 */
export async function processQuadScan(
  session: QuadScanSession
): Promise<QuadScanSession> {
  if (!session?.sourceImageUri) {
    return {
      ...session,
      slots: session.slots.map((slot) => ({
        ...slot,
        status: "error",
        errorMsg: "Image source manquante.",
      })),
    };
  }

  const updatedSlots = await Promise.all(
    session.slots.map(async (slotItem) => {
      try {
        const croppedUri = await cropQuadImage(
          session.sourceImageUri,
          slotItem.slot
        );

        return {
          ...slotItem,
          croppedImageUri: croppedUri,
          status: "processing" as const,
          errorMsg: undefined,
        };
      } catch (error) {
        console.warn(
          `[King_TCG Scanner V5] Échec quadrant ${slotItem.slot}:`,
          error
        );

        return {
          ...slotItem,
          croppedImageUri: null,
          status: "error" as const,
          errorMsg: "Échec du découpage du quadrant.",
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
 * Met à jour le résultat d'analyse d'un quadrant.
 *
 * Le scanner principal appelle cette fonction après
 * la reconnaissance Gemini Vision V5.
 */
export function updateQuadSlotResult(
  session: QuadScanSession,
  slot: QuadSlotIndex,
  cardId: string,
  success: boolean,
  errorMsg?: string
): QuadScanSession {
  const updatedSlots = session.slots.map(
    (item) => {
      if (item.slot !== slot) {
        return item;
      }

      return {
        ...item,

        status: success
          ? ("success" as const)
          : ("error" as const),

        cardId: success
          ? cardId
          : undefined,

        errorMsg: success
          ? undefined
          : errorMsg ?? "Échec de reconnaissance de la carte.",
      };
    }
  );

  return {
    ...session,
    slots: updatedSlots,
  };
}