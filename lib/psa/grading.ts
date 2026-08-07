export const PSA_PHOTO_IDS = [
  "front",
  "back",
  "frontAngle",
  "backAngle",
] as const;

export type PSAPhotoId = (typeof PSA_PHOTO_IDS)[number];

export type PSAPhotoQuality = {
  acceptable: boolean;
  score: number;
  issues: string[];
};

export type PSACriterion = {
  score: number;
  label: string;
  observations: string[];
};

export type PSADefect = {
  area: "centrage" | "coins" | "bords" | "surface" | "photo" | "autre";
  severity: "faible" | "moderee" | "importante";
  description: string;
  photoId?: PSAPhotoId;
};

export type PSAGradeEstimate = {
  minimum: number;
  maximum: number;
  recommended: number | null;
};

export type PSAGradeAnalysis = {
  photoQuality: PSAPhotoQuality;
  estimate: PSAGradeEstimate;
  confidence: number;
  criteria: {
    centering: PSACriterion;
    corners: PSACriterion;
    edges: PSACriterion;
    surface: PSACriterion;
  };
  defects: PSADefect[];
  summary: string;
  recommendations: string[];
  disclaimer: string;
  modelUsed?: string;
};
