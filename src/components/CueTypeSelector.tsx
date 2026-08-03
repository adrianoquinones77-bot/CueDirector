import {
  CUE_TYPES,
  getCueTypeIcon,
  getCueTypeLabel,
  type CueType,
} from "../utils/cueType";

interface CueTypeSelectorProps {
  value: CueType;
  onChange: (type: CueType) => void;
}

export default function CueTypeSelector({
  value,
  onChange,
}: CueTypeSelectorProps) {
  return (
    <fieldset className="cue-type-selector">
      <legend className="dialog__label">Cue Type</legend>
      <div className="cue-type-selector__options">
        {CUE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`cue-type-selector__option${value === type ? " cue-type-selector__option--selected" : ""}`}
            onClick={() => onChange(type)}
            aria-pressed={value === type}
          >
            <span className="cue-type-selector__icon" aria-hidden="true">
              {getCueTypeIcon(type)}
            </span>
            <span className="cue-type-selector__label">{getCueTypeLabel(type)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
