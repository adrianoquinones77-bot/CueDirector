import type { Cue } from "./cue";

export const CUE_FILE_FORMAT = "cues";
export const CUE_FILE_VERSION = 1;

import type { CueType } from "./cueType";

export interface CueFileEntry {
  time: number;
  text: string;
  emoji?: string;
  type?: CueType;
  duration?: number;
  videoId?: string;
  important?: boolean;
}

export interface CueFile {
  format: typeof CUE_FILE_FORMAT;
  version: number;
  songName: string;
  cues: CueFileEntry[];
}

export type { Cue };
