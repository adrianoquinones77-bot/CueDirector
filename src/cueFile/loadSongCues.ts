import { parseCueCsv } from "../parseCueCsv";
import type { Cue } from "../types/cue";
import { mergeCuesWithEditorFile } from "./mergeCues";

export function getMediaBaseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function isVideoFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "mp4" || file.type.startsWith("video/");
}

export interface IndexedMediaFiles {
  videos: Map<string, File>;
  csvs: Map<string, File>;
  cues: Map<string, File>;
}

export function indexMediaFilesByBaseName(
  files: FileList | File[],
): IndexedMediaFiles {
  const videos = new Map<string, File>();
  const csvs = new Map<string, File>();
  const cues = new Map<string, File>();

  for (const file of Array.from(files)) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const baseName = getMediaBaseName(file.name).toLowerCase();

    if (isVideoFile(file)) {
      videos.set(baseName, file);
    } else if (extension === "csv") {
      csvs.set(baseName, file);
    } else if (extension === "cues") {
      cues.set(baseName, file);
    }
  }

  return { videos, csvs, cues };
}

export async function loadSongCues(options: {
  csvFile?: File;
  cuesFile?: File;
  fallbackCues?: Cue[];
}): Promise<Cue[]> {
  let cues = options.fallbackCues ?? [];

  if (options.csvFile) {
    cues = parseCueCsv(await options.csvFile.text());
  }

  if (options.cuesFile) {
    cues = mergeCuesWithEditorFile(cues, await options.cuesFile.text());
  }

  return cues;
}
