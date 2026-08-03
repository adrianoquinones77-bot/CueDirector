interface OpenShowErrorDialogProps {
  title?: string;
  message: string;
  onClose: () => void;
}

export default function OpenShowErrorDialog({
  title = "Could Not Open Show",
  message,
  onClose,
}: OpenShowErrorDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="alertdialog"
        aria-labelledby="open-show-error-title"
        aria-describedby="open-show-error-description"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="open-show-error-title" className="dialog__title">
          {title}
        </h2>
        <p id="open-show-error-description" className="dialog__description">
          {message}
        </p>
        <button type="button" className="dialog__button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
