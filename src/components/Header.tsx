import type { ShowInfo } from "../types/showInfo";
import { formatTime } from "../utils/formatTime";
import EditableField from "./EditableField";

interface HeaderProps {
  currentTime: number;
  showInfo: ShowInfo;
  onShowInfoChange: (field: keyof ShowInfo, value: string) => void;
  activeSongIndex: number;
  totalSongs: number;
  directorMode: boolean;
}

export default function Header({
  currentTime,
  showInfo,
  onShowInfoChange,
  activeSongIndex,
  totalSongs,
  directorMode,
}: HeaderProps) {
  const showProgress = totalSongs > 0 && activeSongIndex >= 0;

  return (
    <header className="header">
      <div className="header__left">
        {directorMode && (
          <span className="director-mode-indicator">🔒 DIRECTOR MODE</span>
        )}

        <EditableField
          icon="🎬"
          value={showInfo.showName}
          placeholder="Show Name"
          onSave={(value) => onShowInfoChange("showName", value)}
        />

        <EditableField
          icon="🏟️"
          value={showInfo.venue}
          placeholder="Venue"
          onSave={(value) => onShowInfoChange("venue", value)}
        />
      </div>

      <div className="header__center">
        <div className="header__brand">CueDirector</div>
        <div className="header__byline">by AQ</div>
      </div>

      <div className="header__right">
        {showProgress && (
          <p className="header__song-progress">
            Song {activeSongIndex + 1} / {totalSongs}
          </p>
        )}
        <div className="timer">{formatTime(currentTime)}</div>
      </div>
    </header>
  );
}
