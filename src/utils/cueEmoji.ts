import type { Cue } from "../types/cue";
import { getCueIconForText } from "./formatCueText";
import { getCueTypeIcon } from "./cueType";

export const DEFAULT_CUE_EMOJI = "📝";

export interface CueEmojiCategory {
  id: string;
  label: string;
  emojis: readonly string[];
}

export const CUE_EMOJI_CATEGORIES: readonly CueEmojiCategory[] = [
  {
    id: "general",
    label: "General",
    emojis: ["📝", "⚫"],
  },
  {
    id: "dj",
    label: "DJ / Performance",
    emojis: ["🎧", "🎛️", "🎤", "🎙️", "🔊", "🔈", "📻"],
  },
  {
    id: "music",
    label: "Music",
    emojis: [
      "🎵",
      "🎶",
      "🎼",
      "🎹",
      "🎸",
      "🎷",
      "🎺",
      "🥁",
      "🎻",
      "🪕",
    ],
  },
  {
    id: "show",
    label: "Show / Stage",
    emojis: ["🎥", "📹", "🎬", "💡", "🔥", "🎉", "👏"],
  },
] as const;

function flattenEmojiCategories(
  categories: readonly CueEmojiCategory[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const category of categories) {
    for (const emoji of category.emojis) {
      if (seen.has(emoji)) continue;
      seen.add(emoji);
      result.push(emoji);
    }
  }

  return result;
}

/** Flat preset list (deduped) for compatibility with existing picker usage. */
export const CUE_EMOJI_PRESETS = flattenEmojiCategories(CUE_EMOJI_CATEGORIES);

const EMOJI_PATTERN =
  /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\s]+$/u;

export function isEmojiString(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && EMOJI_PATTERN.test(trimmed);
}

export function normalizeCueEmoji(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export function resolveCueEmoji(cue: Cue): string {
  if (cue.emoji?.trim()) return cue.emoji.trim();
  return getCueDisplayIcon(cue);
}

/** Custom emoji first, then type/keyword fallbacks, then default. */
export function getCueDisplayIcon(cue: Cue): string {
  const emoji = cue.emoji?.trim();
  if (emoji) return emoji;

  if (cue.type) {
    return getCueTypeIcon(cue.type);
  }

  return getCueIconForText(cue.text) ?? DEFAULT_CUE_EMOJI;
}
