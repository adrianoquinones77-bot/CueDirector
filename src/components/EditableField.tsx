import { useEffect, useRef, useState } from "react";

interface EditableFieldProps {
  icon: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}

export default function EditableField({
  icon,
  value,
  placeholder,
  onSave,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = () => {
    onSave(draft.trim());
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="editable-field editable-field--editing">
        <span className="editable-field__icon" aria-hidden="true">
          {icon}
        </span>
        <input
          ref={inputRef}
          className="editable-field__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") cancel();
          }}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="editable-field"
      onClick={() => setEditing(true)}
    >
      <span className="editable-field__icon" aria-hidden="true">
        {icon}
      </span>
      <span
        className={`editable-field__value${value ? "" : " editable-field__value--placeholder"}`}
      >
        {value || placeholder}
      </span>
    </button>
  );
}
