/**
 * Extensible options for song-to-song handoff.
 * Keep additive so delays/fades/conditions can land later without a model rewrite.
 */
export interface SongLinkOptions {
  /** Wait this many ms after the song ends before starting the next (future). */
  delayMs?: number;
  /** Crossfade / transition duration in ms (future). */
  fadeMs?: number;
  /** Playback transition style (future). */
  transition?: "cut" | "fade";
}

/**
 * Playback chain edge: when this song ends, load/play `nextSongId`.
 * Linking never merges cues — songs stay independent.
 */
export interface SongLink {
  nextSongId: string;
  options?: SongLinkOptions;
}

export function parseSongLink(value: unknown): SongLink | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const nextSongId =
    typeof record.nextSongId === "string" ? record.nextSongId.trim() : "";
  if (!nextSongId) return undefined;

  const link: SongLink = { nextSongId };

  if (record.options && typeof record.options === "object") {
    const raw = record.options as Record<string, unknown>;
    const options: SongLinkOptions = {};
    if (typeof raw.delayMs === "number" && Number.isFinite(raw.delayMs)) {
      options.delayMs = raw.delayMs;
    }
    if (typeof raw.fadeMs === "number" && Number.isFinite(raw.fadeMs)) {
      options.fadeMs = raw.fadeMs;
    }
    if (raw.transition === "cut" || raw.transition === "fade") {
      options.transition = raw.transition;
    }
    if (Object.keys(options).length > 0) {
      link.options = options;
    }
  }

  return link;
}

export function toPersistedSongLink(link: SongLink | undefined): SongLink | undefined {
  if (!link?.nextSongId?.trim()) return undefined;
  return {
    nextSongId: link.nextSongId.trim(),
    ...(link.options ? { options: link.options } : {}),
  };
}
