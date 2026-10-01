interface ImportCuesConflictDialogProps {
  songTitle: string;
  existingCount: number;
  importedCount: number;
  onReplace: () => void;
  onMerge: () => void;
  onCancel: () => void;
}

export default function ImportCuesConflictDialog({
  songTitle,
  existingCount,
  importedCount,
  onReplace,
  onMerge,
  onCancel,
}: ImportCuesConflictDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-labelledby="import-cues-title"
        aria-describedby="import-cues-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="import-cues-title" className="dialog__title">
          Song already has cues
        </h2>
        <p id="import-cues-description" className="dialog__description">
          <strong>{songTitle}</strong> has {existingCount}{" "}
          {existingCount === 1 ? "cue" : "cues"}. The file contains{" "}
          {importedCount} {importedCount === 1 ? "cue" : "cues"}.
        </p>
        <p className="dialog__description dialog__description--muted">
          Replace existing cues, merge with the imported cues, or cancel.
        </p>
        <div className="dialog__actions dialog__actions--stacked">
          <button
            type="button"
            className="dialog__button"
            onClick={onReplace}
          >
            Replace existing cues
          </button>
          <button
            type="button"
            className="dialog__button"
            onClick={onMerge}
          >
            Merge cues
          </button>
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
