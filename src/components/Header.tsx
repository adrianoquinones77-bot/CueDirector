import { formatTime } from "../utils/formatTime";

interface HeaderProps {
  currentTime: number;
}

export default function Header({ currentTime }: HeaderProps) {
  return (
    <header className="header">
      <h1>CueDirector</h1>
      <div className="timer">{formatTime(currentTime)}</div>
    </header>
  );
}
