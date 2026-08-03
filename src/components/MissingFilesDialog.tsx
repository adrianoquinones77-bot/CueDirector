interface MissingFilesDialogProps {
  files: string[];
  onClose: () => void;
}

export default function MissingFilesDialog({
  files,
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
        <button type="button" className="dialog__button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
