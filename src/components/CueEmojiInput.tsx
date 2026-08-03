import {
  CUE_EMOJI_PRESETS,
  DEFAULT_CUE_EMOJI,
} from "../utils/cueEmoji";

interface CueEmojiInputProps {
  value: string;
  onChange: (emoji: string) => void;
}

export default function CueEmojiInput({ value, onChange }: CueEmojiInputProps) {
  return (
    <fieldset className="cue-emoji-input">
      <legend className="dialog__label">Emoji</legend>
      <label className="cue-emoji-input__manual">
        <span className="visually-hidden">Enter emoji</span>
        <input
          type="text"
          className="cue-emoji-input__field"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={DEFAULT_CUE_EMOJI}
          maxLength={8}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <div className="cue-emoji-input__presets">
        {CUE_EMOJI_PRESETS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`cue-emoji-input__preset${value === emoji ? " cue-emoji-input__preset--selected" : ""}`}
            onClick={() => onChange(emoji)}
            aria-label={`Use ${emoji} emoji`}
            aria-pressed={value === emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
