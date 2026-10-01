import { type FormEvent, useEffect, useRef, useState } from "react";

interface AddManualSongDialogProps {
  onSave: (songName: string, notes: string) => void;
  onCancel: () => void;
}

export default function AddManualSongDialog({
  onSave,
  onCancel,
}: AddManualSongDialogProps) {
  const [songName, setSongName] = useState("");
  const [notes, setNotes] = useState("");
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
    const name = songName.trim();
    if (!name) return;
    onSave(name, notes.trim());
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="dialog dialog--form"
        role="dialog"
        aria-modal="true"
        aria-label="Add song to set list"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">Add Song</h2>
        <p className="dialog__hint">
          Add a set list entry without media. You can attach a video later.
        </p>

        <label className="dialog__field">
          <span className="dialog__label">Song Name</span>
          <input
            ref={inputRef}
            type="text"
            className="dialog__input"
            value={songName}
            placeholder="Song name"
            required
            onChange={(event) => setSongName(event.target.value)}
          />
        </label>

        <label className="dialog__field">
          <span className="dialog__label">Notes (optional)</span>
          <textarea
            className="dialog__textarea"
            value={notes}
            placeholder="Notes"
            rows={3}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        <div className="dialog__actions">
          <button type="button" className="dialog__button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="dialog__button dialog__button--primary"
            disabled={!songName.trim()}
          >
            Add Song
          </button>
        </div>
      </form>
    </div>
  );
}
