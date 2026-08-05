interface ImportantCueToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

/** Editor-only Important cue checkbox. */
export default function ImportantCueToggle({
  checked,
  onChange,
  id = "cue-important",
}: ImportantCueToggleProps) {
  return (
    <label className="dialog__toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="dialog__toggle-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="dialog__toggle-control" aria-hidden="true" />
      <span className="dialog__toggle-label">
        <span className="dialog__toggle-star" aria-hidden="true">
          ⭐
        </span>
        Important
      </span>
    </label>
  );
}
