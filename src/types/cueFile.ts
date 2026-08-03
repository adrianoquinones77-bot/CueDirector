import type { Cue } from "./cue";

export const CUE_FILE_FORMAT = "cues";
export const CUE_FILE_VERSION = 1;

export interface CueFileEntry {
  time: number;
  text: string;
  duration?: number;
}

export interface CueFile {
  format: typeof CUE_FILE_FORMAT;
  version: number;
  songName: string;
  cues: CueFileEntry[];
}

export type { Cue };
