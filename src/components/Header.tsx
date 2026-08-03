import { formatTime } from "../utils/formatTime";

interface HeaderProps {
  currentTime: number;
  directorMode: boolean;
}

export default function Header({ currentTime, directorMode }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <h1>CueDirector</h1>
        {directorMode && (
          <span className="director-mode-indicator">🔒 DIRECTOR MODE</span>
        )}
      </div>
      <div className="timer">{formatTime(currentTime)}</div>
    </header>
  );
}
