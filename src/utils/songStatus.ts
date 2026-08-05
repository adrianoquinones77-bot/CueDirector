export type SongStatus = "completed" | "current" | "upcoming";

/** Visual progress only — derived from active index, never persisted on song data. */
export function getSongStatus(
  playlistIndex: number,
  activeSongIndex: number,
): SongStatus {
  if (activeSongIndex < 0) return "upcoming";
  if (playlistIndex < activeSongIndex) return "completed";
  if (playlistIndex === activeSongIndex) return "current";
  return "upcoming";
}

export function getSongStatusIcon(status: SongStatus): string {
  switch (status) {
    case "completed":
      return "✓";
    case "current":
      return "▶";
    case "upcoming":
      return "○";
  }
}
