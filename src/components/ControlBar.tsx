import { type ChangeEvent, useRef } from "react";

interface ControlBarProps {
  onLoadShow: (event: ChangeEvent<HTMLInputElement>) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export default function ControlBar({
  onLoadShow,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
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

      <button type="button" onClick={() => showInputRef.current?.click()}>
        Load Show
      </button>

      <button type="button" disabled={!canGoPrevious} onClick={onPrevious}>
        ◀ Previous Song
      </button>

      <button type="button" disabled={!canGoNext} onClick={onNext}>
        ▶ Next Song
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
