import type { Cue } from "./cue";
import type { ShowMediaItem } from "./showMedia";
import type { ShowInfo } from "./showInfo";
import type { SongLink } from "./songLink";
import type { SongSetList } from "./songSetList";

/** Current on-disk project format identifier. */
export const SHOW_FILE_FORMAT = "show";
/** Legacy format identifier — still accepted when opening older files. */
export const LEGACY_SHOW_FILE_FORMAT = "cuedirector";
export const SHOW_FILE_VERSION = 1;
export const SHOW_FILE_EXTENSION = ".show";

/** @deprecated Use SHOW_FILE_FORMAT */
export const CUE_DIRECTOR_FORMAT = SHOW_FILE_FORMAT;
/** @deprecated Use SHOW_FILE_VERSION */
export const CUE_DIRECTOR_VERSION = SHOW_FILE_VERSION;

export interface CueDirectorSong {
  id: string;
  title: string;
  videoFilename: string;
  /** Path to the video relative to `mediaDirectoryPath`. */
  videoRelativePath?: string;
  cues: Cue[];
  /** Automatic playback chain to another playlist song. */
  link?: SongLink;
  /** Display-only set list metadata. */
  setList?: SongSetList;
}

export interface CueDirectorPreferences {
  autoAdvance: boolean;
  defaultCueDuration: number;
}

export interface ShowTimelineSettings {
  zoom: number;
}

export interface CueDirectorFile {
  format: typeof SHOW_FILE_FORMAT;
  version: number;
  showInfo: ShowInfo;
  preferences: CueDirectorPreferences;
  timeline: ShowTimelineSettings;
  /** Root folder containing show media (absolute path on desktop). */
  mediaDirectoryPath?: string;
  /** Show-level video library (optional for legacy .show files). */
  mediaLibrary?: ShowMediaItem[];
  playlist: CueDirectorSong[];
}

export function isSupportedShowFileFormat(
  format: unknown,
): format is typeof SHOW_FILE_FORMAT | typeof LEGACY_SHOW_FILE_FORMAT {
  return format === SHOW_FILE_FORMAT || format === LEGACY_SHOW_FILE_FORMAT;
}
