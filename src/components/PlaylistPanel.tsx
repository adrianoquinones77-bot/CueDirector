import type { Song } from "../types/song";

interface PlaylistPanelProps {
  songs: Song[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function PlaylistPanel({ songs, activeIndex, onSelect }: PlaylistPanelProps) {
  return (
    <aside className="playlist-panel">
      <h2>Playlist</h2>

      {songs.length === 0 ? (
        <p className="playlist-empty">No show loaded</p>
      ) : (
        <ul className="playlist-list">
          {songs.map((song, index) => (
            <li key={song.id}>
              <button
                type="button"
                className={`playlist-item${index === activeIndex ? " active" : ""}`}
                onClick={() => onSelect(index)}
              >
                🎵 {song.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
