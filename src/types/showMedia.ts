/** Persisted show media library entry (no runtime URL). */
export interface ShowMediaItem {
  id: string;
  filename: string;
  /** Path relative to the show media folder. */
  relativePath?: string;
}

/** Runtime media entry with a playable URL (blob: / file: / cdmedia:). */
export interface RuntimeShowMediaItem extends ShowMediaItem {
  url: string;
}

export function makeMediaId(
  filename: string,
  relativePath?: string,
): string {
  const key = (relativePath?.trim() || filename).replace(/\\/g, "/");
  return key.toLowerCase();
}
