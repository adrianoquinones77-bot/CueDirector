import {
  CUE_FILE_FORMAT,
  CUE_FILE_VERSION,
  type CueFile,
} from "../types/cueFile";
import type { Song } from "../types/song";

export function buildCueFile(song: Song): CueFile {
  return {
    format: CUE_FILE_FORMAT,
    version: CUE_FILE_VERSION,
    songName: song.title,
    cues: song.cues.map((cue) => ({
      time: cue.time,
      text: cue.text,
      ...(cue.emoji !== undefined ? { emoji: cue.emoji } : {}),
      ...(cue.type !== undefined ? { type: cue.type } : {}),
      ...(cue.duration !== undefined ? { duration: cue.duration } : {}),
      ...(cue.videoId !== undefined ? { videoId: cue.videoId } : {}),
      ...(cue.important === true ? { important: true } : {}),
    })),
  };
}

export function downloadCueFile(song: Song): void {
  const cueFile = buildCueFile(song);
  const json = JSON.stringify(cueFile, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${song.id}.cues`;
  anchor.click();
  URL.revokeObjectURL(url);
}
