import type { Cue } from "../types/cue";
import { getCueIconForText } from "./formatCueText";
import { getCueTypeIcon } from "./cueType";

export const DEFAULT_CUE_EMOJI = "📝";

export const CUE_EMOJI_PRESETS = [
  "📝",
  "🎥",
  "🎸",
  "💡",
  "🎤",
  "🔥",
  "🎬",
  "⚫",
  "🎉",
  "📹",
  "🥁",
  "🎹",
] as const;

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
