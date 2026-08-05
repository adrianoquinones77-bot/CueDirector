import { type FormEvent, useEffect, useState } from "react";
import type { CueType } from "../types/cueType";
import { DEFAULT_CUE_TYPE } from "../types/cueType";
import { DEFAULT_CUE_EMOJI } from "../utils/cueEmoji";
import { getDefaultCueNameForEmoji } from "../utils/cueEmojiNames";
import { getCueTypeColor } from "../utils/cueType";
import { formatTime } from "../utils/formatTime";
import CueEmojiInput from "./CueEmojiInput";
import CueTypeSelector from "./CueTypeSelector";
import ImportantCueToggle from "./ImportantCueToggle";

interface AddCueModalProps {
  time: number;
  onSave: (
    cueName: string,
    emoji: string,
    type?: CueType,
    important?: boolean,
  ) => void;
  onCancel: () => void;
}

export default function AddCueModal({
  time,
  onSave,
  onCancel,
}: AddCueModalProps) {
  const [cueName, setCueName] = useState("");
  const [emoji, setEmoji] = useState(DEFAULT_CUE_EMOJI);
  const [cueType, setCueType] = useState<CueType>(DEFAULT_CUE_TYPE);
  const [important, setImportant] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleEmojiChange = (nextEmoji: string) => {
    setEmoji(nextEmoji);

    const defaultName = getDefaultCueNameForEmoji(nextEmoji);
    if (defaultName) {
      // New emoji selection always refreshes the default name.
      // Manual edits stick until another emoji is chosen.
      setCueName(defaultName);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = cueName.trim();
    if (!name) return;
    onSave(name, emoji.trim() || DEFAULT_CUE_EMOJI, cueType, important);
  };

  const accentColor = getCueTypeColor(cueType);

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="dialog dialog--form dialog--add-cue"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        style={{ ["--cue-accent" as string]: accentColor }}
      >
        <h2 className="dialog__title">Create Cue</h2>

        <CueEmojiInput value={emoji} onChange={handleEmojiChange} />

        <label className="dialog__field">
          <span className="dialog__label">Cue Name</span>
          <input
            type="text"
            className="dialog__input"
            placeholder="Select an emoji or enter a cue name"
            autoComplete="off"
            value={cueName}
            onChange={(event) => setCueName(event.target.value)}
          />
        </label>

        <CueTypeSelector value={cueType} onChange={setCueType} />

        <ImportantCueToggle
          id="add-cue-important"
          checked={important}
          onChange={setImportant}
        />

        <label className="dialog__field">
          <span className="dialog__label">Time (MM:SS.t)</span>
          <input
            type="text"
            className="dialog__input"
            value={formatTime(time)}
            readOnly
            tabIndex={-1}
          />
        </label>

        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className="dialog__button">
            Create Cue
          </button>
        </div>
      </form>
    </div>
  );
}
