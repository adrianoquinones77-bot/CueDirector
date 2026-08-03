export const CUE_TYPES = [
  "camera",
  "music",
  "lights",
  "artist",
  "general",
] as const;

export type CueType = (typeof CUE_TYPES)[number];

export const DEFAULT_CUE_TYPE: CueType = "general";
