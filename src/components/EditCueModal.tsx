import { type FormEvent, useEffect, useRef, useState } from "react";
import type { Cue } from "../types/cue";
import {
  DEFAULT_CUE_EMOJI,
  normalizeCueEmoji,
  resolveCueEmoji,
} from "../utils/cueEmoji";
import { formatTime } from "../utils/formatTime";
import CueEmojiInput from "./CueEmojiInput";

interface EditCueModalProps {
  cue: Cue;
  onSave: (cue: Cue) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function EditCueModal({
  cue,
  onSave,
  onDelete,
  onCancel,
}: EditCueModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const [emoji, setEmoji] = useState(resolveCueEmoji(cue));

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
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

    const cueName = nameRef.current?.value.trim() ?? "";
    const timeValue = Number(timeRef.current?.value);
    if (!cueName || Number.isNaN(timeValue) || timeValue < 0) return;

    const normalizedEmoji = normalizeCueEmoji(emoji.trim() || DEFAULT_CUE_EMOJI);
    const updated: Cue = {
      time: timeValue,
      text: cueName,
      ...(normalizedEmoji ? { emoji: normalizedEmoji } : {}),
      ...(cue.type !== undefined ? { type: cue.type } : {}),
      ...(cue.duration !== undefined ? { duration: cue.duration } : {}),
    };

    onSave(updated);
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="dialog dialog--form"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">Edit Cue</h2>

        <label className="dialog__field">
          <span className="dialog__label">Cue Name</span>
          <input
            ref={nameRef}
            type="text"
            className="dialog__input"
            defaultValue={cue.text}
            autoComplete="off"
          />
        </label>

        <label className="dialog__field">
          <span className="dialog__label">Time (seconds)</span>
          <input
            ref={timeRef}
            type="number"
            className="dialog__input"
            min={0}
            step={0.1}
            defaultValue={cue.time}
          />
          <span className="dialog__hint">{formatTime(cue.time)}</span>
        </label>

        <CueEmojiInput value={emoji} onChange={setEmoji} />

        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--danger"
            onClick={onDelete}
          >
            Delete
          </button>
          <span className="dialog__actions-spacer" />
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className="dialog__button">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
