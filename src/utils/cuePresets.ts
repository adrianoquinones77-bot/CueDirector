import type { CueType } from "../types/cueType";
import { DEFAULT_CUE_EMOJI } from "./cueEmoji";

export interface CuePreset {
  id: string;
  /** Dropdown / accessibility label, e.g. "🥁 Percussion". */
  label: string;
  name: string;
  emoji: string;
  /** Cue category used for style / color. */
  type?: CueType;
}

/** Built-in presets for the Add Cue modal. */
export const CUE_PRESETS: readonly CuePreset[] = [
  {
    id: "percussion",
    label: "🥁 Percussion",
    name: "Percussion",
    emoji: "🥁",
    type: "music",
  },
  {
    id: "guitar",
    label: "🎸 Guitarist",
    name: "Guitarist",
    emoji: "🎸",
    type: "music",
  },
  {
    id: "piano",
    label: "🎹 Piano",
    name: "Piano",
    emoji: "🎹",
    type: "music",
  },
  {
    id: "vocals",
    label: "🎤 Vocal",
    name: "Vocal",
    emoji: "🎤",
    type: "artist",
  },
  {
    id: "dancers",
    label: "💃 Dancers",
    name: "Dancers",
    emoji: "💃",
    type: "artist",
  },
  {
    id: "audience",
    label: "👏 Audience",
    name: "Audience",
    emoji: "👏",
    type: "general",
  },
  {
    id: "camera",
    label: "🎥 Video",
    name: "Video",
    emoji: "🎥",
    type: "camera",
  },
  {
    id: "lights",
    label: "💡 Lighting",
    name: "Lighting",
    emoji: "💡",
    type: "lights",
  },
  {
    id: "music",
    label: "🎵 Music",
    name: "Music",
    emoji: "🎵",
    type: "music",
  },
  {
    id: "pyro",
    label: "🔥 Pyro",
    name: "Pyro",
    emoji: "🔥",
    type: "general",
  },
  {
    id: "blackout",
    label: "⚫ Blackout",
    name: "Blackout",
    emoji: "⚫",
    type: "lights",
  },
  {
    id: "general",
    label: `${DEFAULT_CUE_EMOJI} General`,
    name: "General",
    emoji: DEFAULT_CUE_EMOJI,
    type: "general",
  },
] as const;

export const EMPTY_PRESET_ID = "";

export function findCuePreset(id: string): CuePreset | undefined {
  if (!id) return undefined;
  return CUE_PRESETS.find((preset) => preset.id === id);
}

/** Resolve a cue preset from an emoji quick-pick. */
export function findCuePresetByEmoji(emoji: string): CuePreset | undefined {
  const trimmed = emoji.trim();
  if (!trimmed) return undefined;
  return CUE_PRESETS.find((preset) => preset.emoji === trimmed);
}
