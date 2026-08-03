import type { Song } from "../types/song";

interface PlaylistPanelProps {
  songs: Song[];
  activeIndex: number;
  onSelect: (index: number) => void;
  directorMode: boolean;
}

type SongStatus = "completed" | "current" | "upcoming";

function getSongStatus(index: number, activeIndex: number): SongStatus {
  if (index < activeIndex) return "completed";
  if (index === activeIndex) return "current";
  return "upcoming";
}

function getStatusIcon(status: SongStatus): string {
  switch (status) {
    case "completed":
      return "✓";
    case "current":
      return "▶";
    case "upcoming":
      return "○";
  }
}

function formatSongLabel(index: number, title: string): string {
  return `${String(index + 1).padStart(2, "0")} ${title}`;
}

export default function PlaylistPanel({
  songs,
  activeIndex,
  onSelect,
  directorMode,
}: PlaylistPanelProps) {
  const showProgress = songs.length > 0 && activeIndex >= 0;

  return (
    <aside className="playlist-panel">
      <div className="playlist-header">
        <h2 className="playlist-header__title">SHOW</h2>
        {showProgress && (
          <p className="playlist-header__progress">
            Song {activeIndex + 1} / {songs.length}
          </p>
        )}
      </div>

      {songs.length === 0 ? (
        <p className="playlist-empty">No show loaded</p>
      ) : (
        <ul className="playlist-list">
          {songs.map((song, index) => {
            const status = getSongStatus(index, activeIndex);

            return (
              <li key={song.id}>
                <button
                  type="button"
                  className={`playlist-item playlist-item--${status}${status === "current" ? " active" : ""}`}
                  disabled={directorMode}
                  onClick={() => onSelect(index)}
                >
                  <span className="playlist-item__icon" aria-hidden="true">
                    {getStatusIcon(status)}
                  </span>
                  <span className="playlist-item__title">
                    {formatSongLabel(index, song.title)}
                  </span>
                  <span className="playlist-item__cue-count">
                    {song.cues.length}{" "}
                    {song.cues.length === 1 ? "cue" : "cues"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
