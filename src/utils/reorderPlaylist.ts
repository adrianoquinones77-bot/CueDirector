import type { Song } from "../types/song";

/**
 * Move a playlist entry by index. Song objects are reused — cues, links,
 * set-list metadata, and ids are unchanged. Only show order changes.
 */
export function moveSongInPlaylist(
  playlist: Song[],
  fromIndex: number,
  toIndex: number,
): Song[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= playlist.length ||
    toIndex >= playlist.length
  ) {
    return playlist;
  }

  const next = playlist.slice();
  const [song] = next.splice(fromIndex, 1);
  if (!song) return playlist;
  next.splice(toIndex, 0, song);
  return next;
}

/**
 * Move a song so it occupies 1-based position `position` after renumbering.
 */
export function moveSongToShowPosition(
  playlist: Song[],
  fromIndex: number,
  position: number,
): Song[] {
  if (playlist.length === 0) return playlist;
  const targetIndex = Math.min(Math.max(1, Math.floor(position)), playlist.length) - 1;
  return moveSongInPlaylist(playlist, fromIndex, targetIndex);
}
