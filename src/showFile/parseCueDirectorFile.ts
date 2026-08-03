import type { Cue } from "../types/cue";
import {
  CUE_DIRECTOR_FORMAT,
  CUE_DIRECTOR_VERSION,
  type CueDirectorFile,
  type CueDirectorPreferences,
  type CueDirectorSong,
} from "../types/cueDirectorFile";
import type { ShowInfo } from "../types/showInfo";
import { DEFAULT_CUE_DURATION } from "../utils/cueTiming";
import { normalizeCueEmoji } from "../utils/cueEmoji";
import { normalizeCueType } from "../utils/cueType";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseShowInfo(value: unknown): ShowInfo {
  if (!isRecord(value)) {
    throw new Error("Invalid show info");
  }

  return {
    showName: typeof value.showName === "string" ? value.showName : "",
    venue: typeof value.venue === "string" ? value.venue : "",
    date: typeof value.date === "string" ? value.date : "",
  };
}

function parsePreferences(value: unknown): CueDirectorPreferences {
  if (!isRecord(value)) {
    return {
      autoAdvance: true,
      defaultCueDuration: DEFAULT_CUE_DURATION,
    };
  }

  return {
    autoAdvance:
      typeof value.autoAdvance === "boolean" ? value.autoAdvance : true,
    defaultCueDuration:
      typeof value.defaultCueDuration === "number" &&
      value.defaultCueDuration > 0
        ? value.defaultCueDuration
        : DEFAULT_CUE_DURATION,
  };
}

function parseCue(value: unknown): Cue | null {
  if (!isRecord(value)) return null;

  const time = value.time;
  const text = value.text;

  if (typeof time !== "number" || typeof text !== "string" || !text.trim()) {
    return null;
  }

  const cue: Cue = { time, text: text.trim() };

  if (
    typeof value.duration === "number" &&
    value.duration > 0 &&
    Number.isFinite(value.duration)
  ) {
    cue.duration = value.duration;
  }

  if (typeof value.type === "string") {
    cue.type = normalizeCueType(value.type);
  }

  if (typeof value.emoji === "string") {
    const emoji = normalizeCueEmoji(value.emoji);
    if (emoji) cue.emoji = emoji;
  }

  return cue;
}

function parseSong(value: unknown): CueDirectorSong | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : "";
  const title = typeof value.title === "string" ? value.title : "";
  const videoFilename =
    typeof value.videoFilename === "string" ? value.videoFilename : "";

  if (!id || !title || !videoFilename) return null;

  const cues: Cue[] = [];
  if (Array.isArray(value.cues)) {
    for (const entry of value.cues) {
      const cue = parseCue(entry);
      if (cue) cues.push(cue);
    }
  }

  return { id, title, videoFilename, cues };
}

export function parseCueDirectorFile(content: string): CueDirectorFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid show file: not valid JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("Invalid show file: expected an object");
  }

  if (parsed.format !== CUE_DIRECTOR_FORMAT) {
    throw new Error("Invalid show file: unsupported format");
  }

  if (
    typeof parsed.version !== "number" ||
    parsed.version > CUE_DIRECTOR_VERSION
  ) {
    throw new Error("Invalid show file: unsupported version");
  }

  if (!Array.isArray(parsed.playlist)) {
    throw new Error("Invalid show file: missing playlist");
  }

  const playlist: CueDirectorSong[] = [];
  for (const entry of parsed.playlist) {
    const song = parseSong(entry);
    if (song) playlist.push(song);
  }

  return {
    format: CUE_DIRECTOR_FORMAT,
    version: CUE_DIRECTOR_VERSION,
    showInfo: parseShowInfo(parsed.showInfo),
    preferences: parsePreferences(parsed.preferences),
    playlist,
  };
}
