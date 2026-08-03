import { type ChangeEvent, useRef } from "react";
import { supportsMediaDirectoryPicker } from "../media/loadMediaDirectory";

interface ControlBarProps {
  onLoadShowDirectory: () => Promise<void>;
  onLoadShow: (event: ChangeEvent<HTMLInputElement>) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  autoAdvance: boolean;
  onToggleAutoAdvance: () => void;
  directorMode: boolean;
  onToggleDirectorMode: () => void;
  editorMode: boolean;
  onToggleEditorMode: () => void;
  onAddCue: () => void;
  canAddCue: boolean;
  onSaveCues: () => void;
  canSaveCues: boolean;
  defaultCueDuration: number;
  onDefaultCueDurationChange: (value: number) => void;
}

export default function ControlBar({
  onLoadShowDirectory,
  onLoadShow,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  autoAdvance,
  onToggleAutoAdvance,
  directorMode,
  onToggleDirectorMode,
  editorMode,
  onToggleEditorMode,
  onAddCue,
  canAddCue,
  onSaveCues,
  canSaveCues,
  defaultCueDuration,
  onDefaultCueDurationChange,
}: ControlBarProps) {
  const showInputRef = useRef<HTMLInputElement>(null);

  const handleLoadShow = (event: ChangeEvent<HTMLInputElement>) => {
    onLoadShow(event);
    event.target.value = "";
  };

  const handleLoadShowClick = async () => {
    if (supportsMediaDirectoryPicker()) {
      await onLoadShowDirectory();
      return;
    }

    showInputRef.current?.click();
  };

  return (
    <footer className="footer">
      <input
        ref={showInputRef}
        type="file"
        style={{ display: "none" }}
        // @ts-expect-error webkitdirectory is supported in Chromium/Safari
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleLoadShow}
      />

      <button
        type="button"
        disabled={directorMode}
        onClick={handleLoadShowClick}
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

      <button
        type="button"
        className={`footer-toggle${editorMode ? " footer-toggle--on" : ""}`}
        onClick={onToggleEditorMode}
      >
        Editor Mode: {editorMode ? "ON" : "OFF"}
      </button>

      {editorMode && (
        <button
          type="button"
          className="footer-add-cue"
          disabled={!canAddCue}
          onClick={onAddCue}
        >
          Add Cue
        </button>
      )}

      {editorMode && (
        <button
          type="button"
          className="footer-save-cues"
          disabled={directorMode || !canSaveCues}
          onClick={() => void onSaveCues()}
        >
          Save Cues
        </button>
      )}

      {editorMode && (
        <label className="footer-duration">
          <span className="footer-duration__label">Default Cue Duration</span>
          <input
            type="number"
            className="footer-duration__input"
            min={1}
            step={1}
            value={defaultCueDuration}
            disabled={directorMode}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isNaN(value) && value > 0) {
                onDefaultCueDurationChange(value);
              }
            }}
          />
          <span className="footer-duration__unit">s</span>
        </label>
      )}

    </footer>
  );
}
