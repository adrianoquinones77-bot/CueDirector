/** Display-only set list metadata. Never used for playback. */
export interface SongSetList {
  /** Operator-facing name; does not rename the media file. */
  displayName?: string;
  /** Cached media duration in seconds for set list reference. */
  durationSec?: number;
  /**
   * Medley display rows under this song.
   * Playback still uses the single linked media file.
   */
  parts?: string[];
  /** Freeform operator notes (manual songs, reminders, etc.). */
  notes?: string;
}

export function getSongDisplayName(song: {
  title: string;
  setList?: SongSetList;
}): string {
  const display = song.setList?.displayName?.trim();
  return display || song.title;
}

export function formatSetListDuration(seconds: number | undefined): string {
  if (
    seconds === undefined ||
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "—";
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function normalizeSongSetList(
  value: SongSetList | undefined,
): SongSetList | undefined {
  if (!value) return undefined;

  const displayName = value.displayName?.trim();
  const durationSec =
    typeof value.durationSec === "number" &&
    Number.isFinite(value.durationSec) &&
    value.durationSec >= 0
      ? value.durationSec
      : undefined;
  const parts = Array.isArray(value.parts)
    ? value.parts.map((part) => part.trim()).filter(Boolean)
    : undefined;
  const notes = value.notes?.trim();

  const next: SongSetList = {};
  if (displayName) next.displayName = displayName;
  if (durationSec !== undefined) next.durationSec = durationSec;
  if (parts && parts.length > 0) next.parts = parts;
  if (notes) next.notes = notes;

  return Object.keys(next).length > 0 ? next : undefined;
}

/** True when the song has linked video media. */
export function songHasMedia(song: {
  videoFilename?: string;
  videoUrl?: string;
}): boolean {
  return Boolean(song.videoFilename?.trim());
}
