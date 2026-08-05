export const LAST_SHOW_PLAYBACK_POSITION_VERSION = 1;
export const LAST_SHOW_PLAYBACK_POSITION_KEY = "cuedirector-last-show-position";

/** Lightweight playhead restore state — not the show document. */
export interface LastShowPlaybackPosition {
  version: typeof LAST_SHOW_PLAYBACK_POSITION_VERSION;
  savedAt: string;
  activeSongIndex: number;
  currentTime: number;
}
