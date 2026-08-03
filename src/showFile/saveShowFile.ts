import { logShowRestore } from "./showMediaPaths";
import {
  SHOW_FILE_EXTENSION,
  SHOW_FILE_FORMAT,
  SHOW_FILE_VERSION,
  type CueDirectorFile,
} from "../types/cueDirectorFile";
import type { ShowInfo } from "../types/showInfo";
import type { Song } from "../types/song";

export interface SaveShowInput {
  showInfo: ShowInfo;
  autoAdvance: boolean;
  defaultCueDuration: number;
  timelineZoom: number;
  mediaDirectoryPath?: string;
  playlist: Song[];
}

function getDownloadFilename(showInfo: ShowInfo): string {
  const base =
    showInfo.showName
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_") || "show";

  return `${base}${SHOW_FILE_EXTENSION}`;
}

export function buildCueDirectorFile(input: SaveShowInput): CueDirectorFile {
  logShowRestore("Saving .show with media path", input.mediaDirectoryPath ?? "(none)");

  return {
    format: SHOW_FILE_FORMAT,
    version: SHOW_FILE_VERSION,
    showInfo: input.showInfo,
    preferences: {
      autoAdvance: input.autoAdvance,
      defaultCueDuration: input.defaultCueDuration,
    },
    timeline: {
      zoom: input.timelineZoom,
    },
    mediaDirectoryPath: input.mediaDirectoryPath,
    playlist: input.playlist.map((song) => ({
      id: song.id,
      title: song.title,
      videoFilename: song.videoFilename,
      videoRelativePath: song.videoRelativePath,
      cues: song.cues,
    })),
  };
}

export function serializeShowFile(input: SaveShowInput): string {
  return JSON.stringify(buildCueDirectorFile(input), null, 2);
}

export function downloadShowFile(input: SaveShowInput): void {
  const json = serializeShowFile(input);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getDownloadFilename(input.showInfo);
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function writeShowFileToPath(
  filePath: string,
  input: SaveShowInput,
): Promise<void> {
  if (!window.electronAPI) {
    throw new Error("Saving to a show file path requires the desktop app.");
  }

  await window.electronAPI.writeTextFile(
    filePath,
    serializeShowFile(input),
  );
}
