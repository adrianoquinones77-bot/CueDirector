interface ConfirmDeleteSongDialogProps {
  songTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteSongDialog({
  songTitle,
  onConfirm,
  onCancel,
}: ConfirmDeleteSongDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-labelledby="delete-song-title"
        aria-describedby="delete-song-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-song-title" className="dialog__title">
          Delete this song from the show?
        </h2>
        <p id="delete-song-description" className="dialog__description">
          This will remove the song and all of its cues from the current show.
        </p>
        <p className="dialog__cue-preview">
          <span aria-hidden="true">🎥</span> <strong>{songTitle}</strong>
        </p>
        <p className="dialog__description dialog__description--muted">
          The original media file on your computer will not be deleted.
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
