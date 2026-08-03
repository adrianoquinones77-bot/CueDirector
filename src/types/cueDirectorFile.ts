import type { Cue } from "./cue";
import type { ShowInfo } from "./showInfo";

export const CUE_DIRECTOR_FORMAT = "cuedirector";
export const CUE_DIRECTOR_VERSION = 1;

export interface CueDirectorSong {
  id: string;
  title: string;
  videoFilename: string;
  cues: Cue[];
}

export interface CueDirectorPreferences {
  autoAdvance: boolean;
  defaultCueDuration: number;
}

export interface CueDirectorFile {
  format: typeof CUE_DIRECTOR_FORMAT;
  version: number;
  showInfo: ShowInfo;
  preferences: CueDirectorPreferences;
  playlist: CueDirectorSong[];
}
