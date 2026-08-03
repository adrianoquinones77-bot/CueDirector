import { type FormEvent, useEffect, useRef } from "react";
import { formatTime } from "../utils/formatTime";

interface AddCueModalProps {
  time: number;
  onSave: (cueName: string) => void;
  onCancel: () => void;
}

export default function AddCueModal({ time, onSave, onCancel }: AddCueModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cueName = inputRef.current?.value.trim() ?? "";
    if (!cueName) return;
    onSave(cueName);
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="dialog dialog--form"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">Add Cue</h2>
        <p className="dialog__description">
          Timestamp: <strong>{formatTime(time)}</strong>
        </p>

        <label className="dialog__field">
          <span className="dialog__label">Cue Name</span>
          <input
            ref={inputRef}
            type="text"
            className="dialog__input"
            placeholder="Enter cue name"
            autoComplete="off"
          />
        </label>

        <div className="dialog__actions">
          <button type="button" className="dialog__button dialog__button--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="dialog__button">
            Save Cue
          </button>
        </div>
      </form>
    </div>
  );
}
