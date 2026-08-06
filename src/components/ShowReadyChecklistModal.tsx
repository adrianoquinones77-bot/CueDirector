import { memo, useState } from "react";
import { createPortal } from "react-dom";

interface ReadyChecks {
  camera: boolean;
  audio: boolean;
  recording: boolean;
}

interface ShowReadyChecklistModalProps {
  onStartShow: () => void;
}

const INITIAL_CHECKS: ReadyChecks = {
  camera: false,
  audio: false,
  recording: false,
};

function ShowReadyChecklistModal({ onStartShow }: ShowReadyChecklistModalProps) {
  const [checks, setChecks] = useState<ReadyChecks>(INITIAL_CHECKS);

  const allReady = checks.camera && checks.audio && checks.recording;

  const toggle = (key: keyof ReadyChecks) => {
    setChecks((current) => ({ ...current, [key]: !current[key] }));
  };

  const modal = (
    <div
      className="show-ready-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Show Ready checklist"
    >
      <div className="show-ready-modal__card">
        <section
          className="ready-page__checklist"
          aria-label="Show ready checklist"
        >
          <label className="ready-page__check">
            <input
              type="checkbox"
              checked={checks.camera}
              onChange={() => toggle("camera")}
            />
            <span>Camera Ready</span>
          </label>

          <label className="ready-page__check">
            <input
              type="checkbox"
              checked={checks.audio}
              onChange={() => toggle("audio")}
            />
            <span>Audio Ready</span>
          </label>

          <label className="ready-page__check">
            <input
              type="checkbox"
              checked={checks.recording}
              onChange={() => toggle("recording")}
            />
            <span>Recording Started</span>
          </label>
        </section>

        <hr className="ready-page__rule" />

        <button
          type="button"
          className="ready-page__start"
          disabled={!allReady}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onStartShow();
          }}
          onPointerDown={(event) => {
            // Keep the START SHOW gesture from reaching LiveLockShield.
            event.stopPropagation();
          }}
        >
          START SHOW
        </button>

        <hr className="ready-page__rule" />
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return modal;
  }

  return createPortal(modal, document.body);
}

export default memo(ShowReadyChecklistModal);
