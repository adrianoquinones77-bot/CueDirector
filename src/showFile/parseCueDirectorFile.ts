import type { Cue } from "../types/cue";
import {
  isSupportedShowFileFormat,
  SHOW_FILE_FORMAT,
  SHOW_FILE_VERSION,
  type CueDirectorFile,
  type CueDirectorPreferences,
  type CueDirectorSong,
  type ShowTimelineSettings,
} from "../types/cueDirectorFile";
import { makeMediaId, type ShowMediaItem } from "../types/showMedia";
import type { ShowInfo } from "../types/showInfo";
import { parseSongLink } from "../types/songLink";
import {
  normalizeSongSetList,
  type SongSetList,
} from "../types/songSetList";
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
    city: typeof value.city === "string" ? value.city : "",
    country: typeof value.country === "string" ? value.country : "",
    date: typeof value.date === "string" ? value.date : "",
    artist: typeof value.artist === "string" ? value.artist : "",
    director: typeof value.director === "string" ? value.director : "",
  };
}

function parseSongSetList(value: unknown): SongSetList | undefined {
  if (!isRecord(value)) return undefined;

  const parts = Array.isArray(value.parts)
    ? value.parts.filter((part): part is string => typeof part === "string")
    : undefined;

  return normalizeSongSetList({
    displayName:
      typeof value.displayName === "string" ? value.displayName : undefined,
    durationSec:
      typeof value.durationSec === "number" ? value.durationSec : undefined,
    parts,
    notes: typeof value.notes === "string" ? value.notes : undefined,
  });
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

function parseTimeline(value: unknown): ShowTimelineSettings {
  if (!isRecord(value)) {
    return { zoom: 1 };
  }

  const zoom =
    typeof value.zoom === "number" && value.zoom > 0 ? value.zoom : 1;

  return { zoom };
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

  if (typeof value.videoId === "string" && value.videoId.trim()) {
    cue.videoId = value.videoId.trim();
  }

  if (value.important === true) {
    cue.important = true;
  }

  return cue;
}

function parseMediaItem(value: unknown): ShowMediaItem | null {
  if (!isRecord(value)) return null;

  const filename =
    typeof value.filename === "string" ? value.filename.trim() : "";
  if (!filename) return null;

  const relativePath =
    typeof value.relativePath === "string"
      ? value.relativePath.replace(/\\/g, "/")
      : undefined;
  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id.trim()
      : makeMediaId(filename, relativePath);

  return {
    id,
    filename,
    ...(relativePath ? { relativePath } : {}),
  };
}

function parseSong(value: unknown): CueDirectorSong | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : "";
  const title = typeof value.title === "string" ? value.title : "";
  const videoFilename =
    typeof value.videoFilename === "string" ? value.videoFilename : "";
  const videoRelativePath =
    typeof value.videoRelativePath === "string"
      ? value.videoRelativePath.replace(/\\/g, "/")
      : undefined;

  // Manual set-list songs may have no media yet (empty videoFilename).
  if (!id || !title) return null;

  const cues: Cue[] = [];
  if (Array.isArray(value.cues)) {
    for (const entry of value.cues) {
      const cue = parseCue(entry);
      if (cue) cues.push(cue);
    }
  }

  const link = parseSongLink(value.link);
  const setList = parseSongSetList(value.setList);

  return {
    id,
    title,
    videoFilename,
    videoRelativePath,
    cues,
    ...(link ? { link } : {}),
    ...(setList ? { setList } : {}),
  };
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

  if (!isSupportedShowFileFormat(parsed.format)) {
    throw new Error("Invalid show file: unsupported format");
  }

  if (
    typeof parsed.version !== "number" ||
    parsed.version > SHOW_FILE_VERSION
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

  const mediaLibrary: ShowMediaItem[] = [];
  if (Array.isArray(parsed.mediaLibrary)) {
    for (const entry of parsed.mediaLibrary) {
      const item = parseMediaItem(entry);
      if (item) mediaLibrary.push(item);
    }
  }

  return {
    format: SHOW_FILE_FORMAT,
    version: SHOW_FILE_VERSION,
    showInfo: parseShowInfo(parsed.showInfo),
    preferences: parsePreferences(parsed.preferences),
    timeline: parseTimeline(parsed.timeline),
    mediaDirectoryPath:
      typeof parsed.mediaDirectoryPath === "string"
        ? parsed.mediaDirectoryPath
        : undefined,
    ...(mediaLibrary.length > 0 ? { mediaLibrary } : {}),
    playlist,
  };
}

/** @alias parseCueDirectorFile */
export const parseShowFile = parseCueDirectorFile;
