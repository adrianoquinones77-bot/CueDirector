import {
  CUE_DIRECTOR_FORMAT,
  CUE_DIRECTOR_VERSION,
  type CueDirectorFile,
} from "../types/cueDirectorFile";
import type { ShowInfo } from "../types/showInfo";
import type { Song } from "../types/song";

interface SaveShowInput {
  showInfo: ShowInfo;
  autoAdvance: boolean;
  defaultCueDuration: number;
  playlist: Song[];
}

function getDownloadFilename(showInfo: ShowInfo): string {
  const base =
    showInfo.showName
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_") || "show";

  return `${base}.cuedirector`;
}

export function buildCueDirectorFile(input: SaveShowInput): CueDirectorFile {
  return {
    format: CUE_DIRECTOR_FORMAT,
    version: CUE_DIRECTOR_VERSION,
    showInfo: input.showInfo,
    preferences: {
      autoAdvance: input.autoAdvance,
      defaultCueDuration: input.defaultCueDuration,
    },
    playlist: input.playlist.map((song) => ({
      id: song.id,
      title: song.title,
      videoFilename: song.videoFilename,
      cues: song.cues,
    })),
  };
}

export function downloadShowFile(input: SaveShowInput): void {
  const file = buildCueDirectorFile(input);
  const json = JSON.stringify(file, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getDownloadFilename(input.showInfo);
  anchor.click();
  URL.revokeObjectURL(url);
}
