import { type ChangeEvent, useRef } from "react";

interface ControlBarProps {
  onLoadShow: (event: ChangeEvent<HTMLInputElement>) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  autoAdvance: boolean;
  onToggleAutoAdvance: () => void;
  directorMode: boolean;
  onToggleDirectorMode: () => void;
}

export default function ControlBar({
  onLoadShow,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  autoAdvance,
  onToggleAutoAdvance,
  directorMode,
  onToggleDirectorMode,
}: ControlBarProps) {
  const showInputRef = useRef<HTMLInputElement>(null);

  const handleLoadShow = (event: ChangeEvent<HTMLInputElement>) => {
    onLoadShow(event);
    event.target.value = "";
  };

  return (
    <footer className="footer">
      <input
        ref={showInputRef}
        type="file"
        multiple
        accept=".mp4,.csv,video/mp4,text/csv"
        style={{ display: "none" }}
        onChange={handleLoadShow}
      />

      <button
        type="button"
        disabled={directorMode}
        onClick={() => showInputRef.current?.click()}
      >
        Load Show
      </button>

      <button type="button" disabled={!canGoPrevious} onClick={onPrevious}>
        ◀ Previous Song
      </button>

      <button type="button" disabled={!canGoNext} onClick={onNext}>
        ▶ Next Song
      </button>

      <button
        type="button"
        className={`footer-toggle${autoAdvance ? " footer-toggle--on" : ""}`}
        onClick={onToggleAutoAdvance}
      >
        Auto Advance: {autoAdvance ? "ON" : "OFF"}
      </button>

      <button
        type="button"
        className={`footer-toggle${directorMode ? " footer-toggle--on" : ""}`}
        onClick={onToggleDirectorMode}
      >
        Director Mode: {directorMode ? "ON" : "OFF"}
      </button>

      <div className="keyboard-help" aria-label="Keyboard shortcuts">
        <span>
          <kbd>←</kbd> Previous
        </span>
        <span>
          <kbd>→</kbd> Next
        </span>
        <span>
          <kbd>Space</kbd> Play/Pause
        </span>
        <span>
          <kbd>F</kbd> Fullscreen
        </span>
      </div>
    </footer>
  );
}
