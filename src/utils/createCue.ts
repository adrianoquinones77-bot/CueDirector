import type { Cue } from "../types/cue";
import { normalizeCueEmoji } from "./cueEmoji";

/** Coerce/validate cue timestamps. Returns null when not a usable seek time. */
export function sanitizeCueTime(time: unknown): number | null {
  const value = typeof time === "number" ? time : Number(time);
  if (!Number.isFinite(value) || value < 0) return null;
  // Millisecond precision — keeps seek times stable without changing cue logic.
  return Math.round(value * 1000) / 1000;
}

export interface CreateCueInput {
  time: unknown;
  text: unknown;
  emoji?: unknown;
  type?: Cue["type"];
  duration?: Cue["duration"];
  videoId?: string | null;
  important?: boolean;
}

/**
 * Build a cue object for editor create/update.
 * Internal time stays in seconds; emoji/text are normalized strings only.
 */
export function createCue(input: CreateCueInput): Cue | null {
  const time = sanitizeCueTime(input.time);
  if (time === null) return null;

  if (typeof input.text !== "string") return null;
  const text = input.text.trim();
  if (!text) return null;

  const emoji = normalizeCueEmoji(input.emoji);
  const cue: Cue = { time, text };

  if (emoji) {
    cue.emoji = emoji;
  }

  if (input.type !== undefined) {
    cue.type = input.type;
  }

  if (
    typeof input.duration === "number" &&
    Number.isFinite(input.duration) &&
    input.duration > 0
  ) {
    cue.duration = input.duration;
  }

  if (typeof input.videoId === "string" && input.videoId.trim()) {
    cue.videoId = input.videoId.trim();
  }

  if (input.important === true) {
    cue.important = true;
  }

  return cue;
}

export function logNewCueCreated(cue: Cue): void {
  console.log("[NEW CUE CREATED]\ncue object:", cue);
}

export function logPlayCue(
  cue: Pick<Cue, "time" | "text" | "emoji"> | undefined,
  seekTime: number,
  videoPath: string | undefined,
): void {
  console.log("[PLAY CUE]\ncue:", cue ?? "(none)", "\nseek time:", seekTime, "\nvideo path:", videoPath ?? "(none)");
}
