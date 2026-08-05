import { getMediaBaseName } from "../cueFile/loadSongCues";
import type { Song } from "../types/song";
import {
  makeMediaId,
  type RuntimeShowMediaItem,
  type ShowMediaItem,
} from "../types/showMedia";

export function toPersistedMediaLibrary(
  items: RuntimeShowMediaItem[],
): ShowMediaItem[] {
  return items.map(({ id, filename, relativePath }) => ({
    id,
    filename,
    ...(relativePath ? { relativePath } : {}),
  }));
}

export function mediaIdForSong(song: Song): string {
  return makeMediaId(song.videoFilename, song.videoRelativePath);
}

export function mediaItemFromSong(song: Song): RuntimeShowMediaItem {
  return {
    id: mediaIdForSong(song),
    filename: song.videoFilename,
    relativePath: song.videoRelativePath,
    url: song.videoUrl,
  };
}

/** Build a playlist song entry from a library video (empty cues). */
export function songFromMediaItem(item: RuntimeShowMediaItem): Song {
  const baseName = getMediaBaseName(item.filename);
  const title =
    baseName.replace(/^\d+\s*/, "").trim() || baseName || item.filename;

  return {
    id: baseName || item.id,
    title,
    videoFilename: item.filename,
    videoRelativePath: item.relativePath,
    videoUrl: item.url,
    cues: [],
  };
}

/** Merge runtime media items by id; later entries win on URL when present. */
export function mergeMediaLibraries(
  ...groups: RuntimeShowMediaItem[][]
): RuntimeShowMediaItem[] {
  const map = new Map<string, RuntimeShowMediaItem>();

  for (const group of groups) {
    for (const item of group) {
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
        continue;
      }

      map.set(item.id, {
        ...existing,
        ...item,
        url: item.url || existing.url,
      });
    }
  }

  return [...map.values()].sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, { numeric: true }),
  );
}

export function buildMediaLibraryFromPlaylist(
  playlist: Song[],
): RuntimeShowMediaItem[] {
  return mergeMediaLibraries(
    playlist
      .filter((song) => song.videoFilename)
      .map((song) => mediaItemFromSong(song)),
  );
}

/**
 * Order library items by playlist sequence so linked chains stay visually
 * contiguous; any library-only videos follow afterward.
 */
export function orderMediaItemsByPlaylist(
  items: RuntimeShowMediaItem[],
  playlist: Song[],
): RuntimeShowMediaItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: RuntimeShowMediaItem[] = [];
  const used = new Set<string>();

  for (const song of playlist) {
    const id = mediaIdForSong(song);
    const item = byId.get(id);
    if (!item || used.has(id)) continue;
    ordered.push(item);
    used.add(id);
  }

  for (const item of items) {
    if (used.has(item.id)) continue;
    ordered.push(item);
    used.add(item.id);
  }

  return ordered;
}

export function findMediaById(
  library: RuntimeShowMediaItem[],
  videoId: string | undefined,
): RuntimeShowMediaItem | undefined {
  if (!videoId) return undefined;
  return library.find((item) => item.id === videoId);
}

export function resolveCueVideoUrl(
  library: RuntimeShowMediaItem[],
  cueVideoId: string | undefined,
  fallbackUrl: string | undefined,
): string | undefined {
  const fromLibrary = findMediaById(library, cueVideoId);
  if (fromLibrary?.url) return fromLibrary.url;
  return fallbackUrl || undefined;
}
