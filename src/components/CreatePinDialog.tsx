import { type FormEvent, useEffect, useRef, useState } from "react";
import { isValidPerformancePin } from "../session/performancePinStorage";

interface CreatePinDialogProps {
  onSave: (pin: string) => void;
  onCancel: () => void;
}

export default function CreatePinDialog({
  onSave,
  onCancel,
}: CreatePinDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidPerformancePin(pin)) {
      setError("PIN must be 4–6 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    onSave(pin);
  };

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="dialog dialog--form"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">Create Lock PIN</h2>
        <p className="dialog__description">
          Set a 4–6 digit PIN to lock the screen during a live show. This PIN
          stays on this device and is not required to open a show.
        </p>

        <label className="dialog__field">
          <span className="dialog__label">PIN</span>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="new-password"
            className="dialog__input"
            value={pin}
            maxLength={6}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError(null);
            }}
          />
        </label>

        <label className="dialog__field">
          <span className="dialog__label">Confirm PIN</span>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="new-password"
            className="dialog__input"
            value={confirmPin}
            maxLength={6}
            onChange={(event) => {
              setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError(null);
            }}
          />
        </label>

        {error && <p className="dialog__error">{error}</p>}

        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className="dialog__button">
            Save &amp; Lock
          </button>
        </div>
      </form>
    </div>
  );
}
