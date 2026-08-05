import { type FormEvent, useEffect, useRef, useState } from "react";
import type { Cue } from "../types/cue";
import type { RuntimeShowMediaItem } from "../types/showMedia";
import { DEFAULT_CUE_EMOJI, resolveCueEmoji } from "../utils/cueEmoji";
import { createCue } from "../utils/createCue";
import { formatTime, parseCueEditorTime } from "../utils/formatTime";
import CueEmojiInput from "./CueEmojiInput";
import ImportantCueToggle from "./ImportantCueToggle";

interface EditCueModalProps {
  cue: Cue;
  mediaLibrary: RuntimeShowMediaItem[];
  defaultVideoLabel?: string;
  onSave: (cue: Cue) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function EditCueModal({
  cue,
  mediaLibrary,
  defaultVideoLabel = "Song video (default)",
  onSave,
  onDelete,
  onCancel,
}: EditCueModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const [emoji, setEmoji] = useState(resolveCueEmoji(cue));
  const [videoId, setVideoId] = useState(cue.videoId ?? "");
  const [important, setImportant] = useState(cue.important === true);

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
    const timeValue = parseCueEditorTime(timeRef.current?.value ?? "");
    if (!cueName || timeValue === null) return;

    const updated = createCue({
      time: timeValue,
      text: cueName,
      emoji: emoji.trim() || DEFAULT_CUE_EMOJI,
      type: cue.type,
      duration: cue.duration,
      videoId: videoId || null,
      important,
    });
    if (!updated) return;

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
          <span className="dialog__label">Time (MM:SS.t)</span>
          <input
            ref={timeRef}
            type="text"
            className="dialog__input"
            inputMode="decimal"
            placeholder="00:00.0"
            defaultValue={formatTime(cue.time)}
            autoComplete="off"
          />
        </label>

        <label className="dialog__field">
          <span className="dialog__label">Video</span>
          <select
            className="dialog__input"
            value={videoId}
            onChange={(event) => setVideoId(event.target.value)}
          >
            <option value="">{defaultVideoLabel}</option>
            {mediaLibrary.map((item) => (
              <option key={item.id} value={item.id}>
                {item.relativePath || item.filename}
              </option>
            ))}
          </select>
        </label>

        <CueEmojiInput value={emoji} onChange={setEmoji} />

        <ImportantCueToggle
          id="edit-cue-important"
          checked={important}
          onChange={setImportant}
        />

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
