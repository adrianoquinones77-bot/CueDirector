import type { ShowInfo } from "../types/showInfo";
import { formatTime } from "../utils/formatTime";
import EditableField from "./EditableField";
import {
  ShortcutsHelpBar,
  ShortcutsToggle,
} from "./KeyboardShortcutsGuide";
import type { ShortcutHandlers } from "../keyboard/shortcuts";

interface HeaderProps {
  currentTime: number;
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

export default function Header({
  currentTime,
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

  return (
    <div className="header-area">
      <header className="header">
        <div className="header__left">
          {directorMode && (
            <span className="director-mode-indicator">🔒 DIRECTOR MODE</span>
          )}
          {editorMode && (
            <span className="editor-mode-indicator">✎ EDITOR MODE</span>
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
          <div className="header__status">
            {showProgress && (
              <p className="header__song-progress">
                Song {activeSongIndex + 1} / {totalSongs}
              </p>
            )}
            <div className="timer">{formatTime(currentTime)}</div>
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
