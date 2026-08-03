interface MissingFilesDialogProps {
  files: string[];
  isRelinking?: boolean;
  onRelink: () => void | Promise<void>;
  onClose: () => void;
}

export default function MissingFilesDialog({
  files,
  isRelinking = false,
  onRelink,
  onClose,
}: MissingFilesDialogProps) {
  if (files.length === 0) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="alertdialog"
        aria-labelledby="missing-files-title"
        aria-describedby="missing-files-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="missing-files-title" className="dialog__title">
          Missing Video Files
        </h2>
        <p id="missing-files-description" className="dialog__description">
          The show was restored, but these video files were not found in the
          selected media folder:
        </p>
        <ul className="dialog__list">
          {files.map((filename) => (
            <li key={filename}>{filename}</li>
          ))}
        </ul>
        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            disabled={isRelinking}
            onClick={() => void onRelink()}
          >
            {isRelinking ? "Searching…" : "Relink Media Folder"}
          </button>
          <div className="dialog__actions-spacer" />
          <button
            type="button"
            className="dialog__button"
            disabled={isRelinking}
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
