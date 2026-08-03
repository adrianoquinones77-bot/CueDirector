import type { Cue } from "../types/cue";
import {
  CUE_FILE_FORMAT,
  CUE_FILE_VERSION,
  type CueFile,
} from "../types/cueFile";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCueEntry(value: unknown): Cue | null {
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

  return cue;
}

export function parseCueFile(content: string): CueFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid .cues file: not valid JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("Invalid .cues file: expected an object");
  }

  if (parsed.format !== CUE_FILE_FORMAT) {
    throw new Error("Invalid .cues file: unsupported format");
  }

  if (typeof parsed.version !== "number" || parsed.version > CUE_FILE_VERSION) {
    throw new Error("Invalid .cues file: unsupported version");
  }

  const songName =
    typeof parsed.songName === "string" ? parsed.songName.trim() : "";

  if (!Array.isArray(parsed.cues)) {
    throw new Error("Invalid .cues file: missing cues array");
  }

  const cues: Cue[] = [];
  for (const entry of parsed.cues) {
    const cue = parseCueEntry(entry);
    if (cue) cues.push(cue);
  }

  return {
    format: CUE_FILE_FORMAT,
    version: CUE_FILE_VERSION,
    songName,
    cues: cues.sort((a, b) => a.time - b.time),
  };
}

export function cuesFromCueFile(cueFile: CueFile): Cue[] {
  return cueFile.cues.map((cue) => ({
    time: cue.time,
    text: cue.text,
    ...(cue.duration !== undefined ? { duration: cue.duration } : {}),
  }));
}
