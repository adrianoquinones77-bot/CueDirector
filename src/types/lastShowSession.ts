import type { CueDirectorFile } from "./cueDirectorFile";

export const LAST_SHOW_SESSION_VERSION = 1;
export const LAST_SHOW_STORAGE_KEY = "cuedirector-last-show";

export interface LastShowSession {
  version: typeof LAST_SHOW_SESSION_VERSION;
  savedAt: string;
  /** Absolute media folder path (Electron). */
  mediaDirectoryPath?: string;
  /** Absolute .show path when opened from file (Electron). */
  showFilePath?: string;
  show: CueDirectorFile;
  activeSongIndex: number;
  currentTime: number;
  timelineZoom: number;
}
