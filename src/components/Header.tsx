import { memo } from "react";
import { usePlaybackTime } from "../playback/playbackClock";
import { useShowLive } from "../playback/showClock";
import type { ShowInfo } from "../types/showInfo";
import { formatTime } from "../utils/formatTime";
import EditableField from "./EditableField";
import {
  ShortcutsHelpBar,
  ShortcutsToggle,
} from "./KeyboardShortcutsGuide";
import type { ShortcutHandlers } from "../keyboard/shortcuts";

interface HeaderProps {
  showInfo: ShowInfo;
  onShowInfoChange: (field: keyof ShowInfo, value: string) => void;
  activeSongIndex: number;
  totalSongs: number;
  directorMode: boolean;
  editorMode: boolean;
  shortcutHandlers: ShortcutHandlers;
  shortcutsOpen: boolean;
  onToggleShortcuts: () => void;
}

/** Isolated subscriber so Header chrome does not re-render every tick. */
function PlaybackTimer() {
  const currentTime = usePlaybackTime();
  return <div className="timer">{formatTime(currentTime)}</div>;
}

function Header({
  showInfo,
  onShowInfoChange,
  activeSongIndex,
  totalSongs,
  directorMode,
  editorMode,
  shortcutHandlers,
  shortcutsOpen,
  onToggleShortcuts,
}: HeaderProps) {
  const showProgress = totalSongs > 0 && activeSongIndex >= 0;
  const showLive = useShowLive();

  return (
    <div className="header-area">
      <header className="header">
        <div className="header__left">
          {(showLive || directorMode || editorMode) && (
            <div className="header__mode-row">
              {showLive && <span className="live-indicator">● LIVE</span>}
              {directorMode && (
                <span className="director-mode-indicator">🔒 DIRECTOR MODE</span>
              )}
              {editorMode && (
                <span className="editor-mode-indicator">✎ EDITOR MODE</span>
              )}
            </div>
          )}

          <div className="header__fields">
            <EditableField
              icon="🎬"
              value={showInfo.showName}
              placeholder="Show Name"
              onSave={(value) => onShowInfoChange("showName", value)}
            />
            <EditableField
              icon="🎤"
              value={showInfo.artist}
              placeholder="Artist"
              onSave={(value) => onShowInfoChange("artist", value)}
            />
            <EditableField
              icon="🎥"
              value={showInfo.director}
              placeholder="Director"
              onSave={(value) => onShowInfoChange("director", value)}
            />
            <EditableField
              icon="🏟️"
              value={showInfo.venue}
              placeholder="Venue"
              onSave={(value) => onShowInfoChange("venue", value)}
            />
          </div>
        </div>

        <div className="header__center">
          <div className="header__brand">CueDirector</div>
          <div className="header__byline">by AQ</div>
        </div>

        <div className="header__right">
          <div className="header__status">
            {showProgress && (
              <p className="header__song-progress">
                Song {activeSongIndex + 1} / {totalSongs}
              </p>
            )}
            <PlaybackTimer />
          </div>
          <ShortcutsToggle
            open={shortcutsOpen}
            onToggle={onToggleShortcuts}
          />
        </div>
      </header>

      {shortcutsOpen && (
        <ShortcutsHelpBar
          handlers={shortcutHandlers}
          editorMode={editorMode}
        />
      )}
    </div>
  );
}

export default memo(Header);
