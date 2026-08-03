import type { Cue } from "../types/cue";
import {
  CUE_TYPES,
  DEFAULT_CUE_TYPE,
  type CueType,
} from "../types/cueType";
export { getCueDisplayIcon } from "./cueEmoji";

const CUE_TYPE_ICONS: Record<CueType, string> = {
  camera: "🎥",
  music: "🎸",
  lights: "💡",
  artist: "🎤",
  general: "📌",
};

const CUE_TYPE_LABELS: Record<CueType, string> = {
  camera: "Camera",
  music: "Music",
  lights: "Lights",
  artist: "Artist",
  general: "General",
};

export { CUE_TYPES, DEFAULT_CUE_TYPE, type CueType };

export function isCueType(value: string): value is CueType {
  return (CUE_TYPES as readonly string[]).includes(value);
}

export function normalizeCueType(value: unknown): CueType {
  if (typeof value === "string" && isCueType(value)) {
    return value;
  }
  return DEFAULT_CUE_TYPE;
}

export function resolveCueType(cue: Cue): CueType {
  return cue.type ?? DEFAULT_CUE_TYPE;
}

export function getCueTypeIcon(type: CueType): string {
  return CUE_TYPE_ICONS[type];
}

export function getCueTypeLabel(type: CueType): string {
  return CUE_TYPE_LABELS[type];
}

