import { memo } from "react";
import {
  formatShowClock,
  useShowElapsedSeconds,
  useShowLive,
  useShowSessionActive,
} from "../playback/showClock";

/** Isolated subscriber — only this footer re-renders each second while live. */
function ShowTimer() {
  const sessionActive = useShowSessionActive();
  const live = useShowLive();
  const elapsedSeconds = useShowElapsedSeconds();

  if (!sessionActive) return null;

  return (
    <div
      className={`show-timer${live ? " show-timer--live" : ""}`}
      aria-label="Show timer"
    >
      <span className="show-timer__label">SHOW</span>
      <span className="show-timer__value">{formatShowClock(elapsedSeconds)}</span>
    </div>
  );
}

export default memo(ShowTimer);
