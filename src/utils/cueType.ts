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

/** Accent colors used by cue type / category UI. */
const CUE_TYPE_COLORS: Record<CueType, string> = {
  camera: "#3b82f6",
  music: "#a855f7",
  lights: "#f59e0b",
  artist: "#ef4444",
  general: "#94a3b8",
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

export function getCueTypeColor(type: CueType): string {
  return CUE_TYPE_COLORS[type];
}

