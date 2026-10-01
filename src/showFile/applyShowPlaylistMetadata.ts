import type { CueDirectorFile, CueDirectorSong } from "../types/cueDirectorFile";
import type { Song } from "../types/song";

function isShowFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".show") || lower.endsWith(".cuedirector");
}

export function findShowFileInList<T extends { name: string }>(
  files: readonly T[],
): T | undefined {
  return files.find((file) => isShowFileName(file.name));
}

/**
 * Re-apply persisted playlist metadata (links, set list) onto media-built songs.
 * Show-file playlist order and membership are authoritative — media-only songs
 * that are not in the project are not appended (delete + save must stick).
 * Match by song id first, then by video filename. Does not change save format.
 */
export function applyShowPlaylistMetadata(
  songs: Song[],
  showFile: CueDirectorFile,
): Song[] {
  if (songs.length === 0) return songs;
  if (showFile.playlist.length === 0) return songs;

  const byId = new Map<string, Song>();
  const byFilename = new Map<string, Song>();

  for (const song of songs) {
    byId.set(song.id, song);
    byFilename.set(song.videoFilename.toLowerCase(), song);
  }

  const merged: Song[] = [];
  const used = new Set<string>();

  for (const entry of showFile.playlist) {
    const song =
      byId.get(entry.id) ??
      byFilename.get(entry.videoFilename.toLowerCase());
    if (!song || used.has(song.id)) continue;

    merged.push(withShowEntryMetadata(song, entry));
    used.add(song.id);
  }

  return merged;
}

function withShowEntryMetadata(song: Song, entry: CueDirectorSong): Song {
  return {
    ...song,
    ...(entry.link ? { link: entry.link } : {}),
    ...(entry.setList ? { setList: entry.setList } : {}),
  };
}
