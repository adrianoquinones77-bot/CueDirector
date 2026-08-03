import type { Cue } from "../types/cue";
import { getCueDisplayIcon } from "../utils/cueEmoji";
import { getCueLabel } from "../utils/formatCueText";
import { formatTime } from "../utils/formatTime";

interface ConfirmDeleteCueDialogProps {
  cue: Cue;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteCueDialog({
  cue,
  onConfirm,
  onCancel,
}: ConfirmDeleteCueDialogProps) {
  const label = getCueLabel(cue.text);
  const emoji = getCueDisplayIcon(cue);

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-labelledby="delete-cue-title"
        aria-describedby="delete-cue-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-cue-title" className="dialog__title">
          Delete Cue?
        </h2>
        <p id="delete-cue-description" className="dialog__description">
          This will permanently remove the cue from the cue sheet and timeline.
        </p>
        <p className="dialog__cue-preview">
          <span aria-hidden="true">{emoji}</span>{" "}
          <strong>{label}</strong>
          <span className="dialog__cue-preview-time"> at {formatTime(cue.time)}</span>
        </p>
        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dialog__button dialog__button--danger"
            onClick={onConfirm}
          >
            Delete Cue
          </button>
        </div>
      </div>
    </div>
  );
}
