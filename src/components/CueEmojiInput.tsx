import {
  CUE_EMOJI_CATEGORIES,
  DEFAULT_CUE_EMOJI,
} from "../utils/cueEmoji";

interface CueEmojiInputProps {
  value: string;
  onChange: (emoji: string) => void;
}

export default function CueEmojiInput({ value, onChange }: CueEmojiInputProps) {
  return (
    <fieldset className="cue-emoji-input">
      <legend className="dialog__label">Preset / Emoji</legend>
      <p className="cue-emoji-input__hint">
        Click an emoji to fill the cue name. You can still edit the name before
        creating.
      </p>
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
      <div className="cue-emoji-input__categories">
        {CUE_EMOJI_CATEGORIES.map((category) => (
          <section key={category.id} className="cue-emoji-input__category">
            <h3 className="cue-emoji-input__category-label">{category.label}</h3>
            <div className="cue-emoji-input__presets">
              {category.emojis.map((emoji) => (
                <button
                  key={`${category.id}-${emoji}`}
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
          </section>
        ))}
      </div>
    </fieldset>
  );
}
