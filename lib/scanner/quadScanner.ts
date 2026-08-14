// lib/scanner/quadScanner.ts

import { QUAD_FRAMES } from "@/lib/scanner/quadLayout";

export type QuadSlotIndex = 0 | 1 | 2 | 3;
export type QuadSlotStatus =
  | "empty"
  | "cropping"
  | "ready"
  | "processing"
  | "success"
  | "review"
  | "error";

export type QuadImageQuality = {
  score: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  warning?: string;
};

export type QuadCropResult = {
  primaryImageUri: string;
  enhancedImageUri: string;
  quality: QuadImageQuality;
};

export type QuadScanItem = {
  slot: QuadSlotIndex;
  label: string;
  croppedImageUri: string | null;
  enhancedImageUri?: string | null;
  status: QuadSlotStatus;
  quality?: QuadImageQuality;
  attempts?: number;
  confidence?: number;
  cardId?: string;
  errorMsg?: string;
};

export type QuadScanSession = {
  id: string;
  sourceImageUri: string;
  createdAt: string;
  slots: QuadScanItem[];
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));

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

function analyseCropQuality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): QuadImageQuality {
  const data = ctx.getImageData(0, 0, width, height).data;
  const step = Math.max(2, Math.round(Math.min(width, height) / 150));
  let count = 0;
  let sum = 0;
  let sumSquares = 0;
  let edgeSum = 0;
  let edgeCount = 0;

  const luminanceAt = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    return data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
  };

  for (let y = 0; y < height - step; y += step) {
    for (let x = 0; x < width - step; x += step) {
      const luminance = luminanceAt(x, y);
      sum += luminance;
      sumSquares += luminance * luminance;
      count += 1;
      edgeSum += Math.abs(luminance - luminanceAt(x + step, y));
      edgeSum += Math.abs(luminance - luminanceAt(x, y + step));
      edgeCount += 2;
    }
  }

  const brightness = count ? sum / count : 0;
  const variance = count ? Math.max(0, sumSquares / count - brightness * brightness) : 0;
  const contrast = Math.sqrt(variance);
  const sharpness = edgeCount ? edgeSum / edgeCount : 0;
  const exposure = clamp(1 - Math.abs(brightness - 128) / 128);
  const score = clamp(
    clamp(contrast / 52) * 0.46 +
    clamp(sharpness / 26) * 0.39 +
    exposure * 0.15
  );

  let warning: string | undefined;
  if (brightness < 24) warning = "Zone trop sombre";
  else if (brightness > 238) warning = "Zone surexposée";
  else if (contrast < 10 && sharpness < 7) warning = "Zone vide ou trop floue";
  else if (score < 0.34) warning = "Netteté insuffisante";

  return {
    score,
    brightness: Math.round(brightness),
    contrast: Math.round(contrast),
    sharpness: Math.round(sharpness),
    warning,
  };
}

export async function cropQuadImageVariants(
  sourceImageUri: string,
  slot: QuadSlotIndex
): Promise<QuadCropResult> {
  if (typeof window === "undefined") {
    return {
      primaryImageUri: sourceImageUri,
      enhancedImageUri: sourceImageUri,
      quality: { score: 1, brightness: 128, contrast: 64, sharpness: 32 },
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const frame = QUAD_FRAMES.find((item) => item.slot === slot);
      if (!frame) {
        reject(new Error("Zone Quad inconnue"));
        return;
      }

      // Une petite marge conserve les quatre bordures réelles même si
      // l'utilisateur n'est pas exactement au pixel près dans le guide.
      const marginX = frame.width * 0.025;
      const marginY = frame.height * 0.025;
      const normalizedX = Math.max(0, frame.x - marginX);
      const normalizedY = Math.max(0, frame.y - marginY);
      const normalizedWidth = Math.min(1 - normalizedX, frame.width + marginX * 2);
      const normalizedHeight = Math.min(1 - normalizedY, frame.height + marginY * 2);

      const sx = Math.round(img.width * normalizedX);
      const sy = Math.round(img.height * normalizedY);
      const sw = Math.max(1, Math.round(img.width * normalizedWidth));
      const sh = Math.max(1, Math.round(img.height * normalizedHeight));
      const targetWidth = Math.min(900, Math.max(560, sw));
      const targetHeight = Math.min(1280, Math.max(1, Math.round(targetWidth * (sh / sw))));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        reject(new Error("Impossible d'initialiser le contexte canvas"));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      const quality = analyseCropQuality(ctx, targetWidth, targetHeight);
      const primaryImageUri = canvas.toDataURL("image/jpeg", 0.94);

      const enhanced = document.createElement("canvas");
      enhanced.width = targetWidth;
      enhanced.height = targetHeight;
      const enhancedCtx = enhanced.getContext("2d", { alpha: false });
      if (!enhancedCtx) {
        reject(new Error("Impossible de préparer le second passage"));
        return;
      }
      const brightnessCorrection = quality.brightness < 82
        ? 1.16
        : quality.brightness > 195
          ? 0.92
          : 1.04;
      enhancedCtx.imageSmoothingEnabled = true;
      enhancedCtx.imageSmoothingQuality = "high";
      enhancedCtx.filter = `brightness(${brightnessCorrection}) contrast(1.18) saturate(1.06)`;
      enhancedCtx.drawImage(canvas, 0, 0);
      enhancedCtx.filter = "none";

      resolve({
        primaryImageUri,
        enhancedImageUri: enhanced.toDataURL("image/jpeg", 0.94),
        quality,
      });
    };

    img.onerror = () => reject(new Error("Image Quad illisible"));
    img.src = sourceImageUri;
  });
}

export async function cropQuadImage(
  sourceImageUri: string,
  slot: QuadSlotIndex
): Promise<string> {
  return (await cropQuadImageVariants(sourceImageUri, slot)).primaryImageUri;
}

export async function processQuadScan(
  session: QuadScanSession,
  selectedSlots?: QuadSlotIndex[]
): Promise<QuadScanSession> {
  const selected = selectedSlots ? new Set<QuadSlotIndex>(selectedSlots) : null;
  const updatedSlots = await Promise.all(
    session.slots.map(async (slotItem) => {
      if (selected && !selected.has(slotItem.slot)) return slotItem;
      try {
        const crop = await cropQuadImageVariants(session.sourceImageUri, slotItem.slot);
        return {
          ...slotItem,
          croppedImageUri: crop.primaryImageUri,
          enhancedImageUri: crop.enhancedImageUri,
          quality: crop.quality,
          status: "ready" as const,
          attempts: 0,
          errorMsg: crop.quality.warning,
        };
      } catch {
        return {
          ...slotItem,
          status: "error" as const,
          errorMsg: "Échec du découpage de cette zone",
        };
      }
    })
  );

  return { ...session, slots: updatedSlots };
}

export function updateQuadSlotResult(
  session: QuadScanSession,
  slot: QuadSlotIndex,
  cardId: string,
  success: boolean,
  errorMsg?: string,
  confidence?: number
): QuadScanSession {
  return {
    ...session,
    slots: session.slots.map((item) => item.slot === slot
      ? {
          ...item,
          status: success ? "success" : "error",
          cardId: success ? cardId : undefined,
          confidence,
          errorMsg,
        }
      : item),
  };
}
