import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ShowInfo } from "../types/showInfo";
import { verifyPerformancePin } from "../session/performancePinStorage";

interface ShowReadyPinGateProps {
  showInfo: ShowInfo;
  onSuccess: () => void;
  onCancel: () => void;
}

function displayValue(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

/**
 * Lock-screen PIN gate shown before entering Show Ready checklist.
 * On success the app locks and the checklist opens — this is not an unlock.
 */
export default function ShowReadyPinGate({
  showInfo,
  onSuccess,
  onCancel,
}: ShowReadyPinGateProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
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

    const ok = verifyPerformancePin(pin);
    // #region agent log
    fetch('http://127.0.0.1:7662/ingest/2edb04e6-0a86-4d03-b142-8e0cd3b07871',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6db2d5'},body:JSON.stringify({sessionId:'6db2d5',hypothesisId:'B',location:'ShowReadyPinGate.tsx:handleSubmit',message:'PinGate submit',data:{pinLength:pin.length,verified:ok},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (!ok) {
      setError("Incorrect PIN");
      setPin("");
      inputRef.current?.focus();
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7662/ingest/2edb04e6-0a86-4d03-b142-8e0cd3b07871',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6db2d5'},body:JSON.stringify({sessionId:'6db2d5',hypothesisId:'B',location:'ShowReadyPinGate.tsx:onSuccess',message:'PinGate calling onSuccess → enterShowReadyChecklist',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    onSuccess();
  };

  const overlay = (
    <div
      className="performance-lock"
      role="dialog"
      aria-modal="true"
      aria-label="Show Ready lock"
    >
      <form className="performance-lock__card" onSubmit={handleSubmit}>
        <div className="performance-lock__brand">
          <div className="performance-lock__logo" aria-hidden="true">
            CD
          </div>
          <h1 className="performance-lock__product">CueDirector</h1>
          <p className="performance-lock__byline">Show Ready</p>
        </div>

        <div className="performance-lock__show">
          <p className="performance-lock__show-title">
            {displayValue(showInfo?.showName, "Untitled Show")}
          </p>
          <dl className="performance-lock__meta">
            <div>
              <dt>Artist</dt>
              <dd>{displayValue(showInfo?.artist, "—")}</dd>
            </div>
            <div>
              <dt>Director</dt>
              <dd>{displayValue(showInfo?.director, "—")}</dd>
            </div>
          </dl>
        </div>

        <label className="performance-lock__field">
          <span className="performance-lock__label">PIN</span>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className="performance-lock__input"
            value={pin}
            maxLength={6}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError(null);
            }}
          />
        </label>

        {error && <p className="performance-lock__error">{error}</p>}

        <button type="submit" className="performance-lock__unlock">
          Continue
        </button>
      </form>
    </div>
  );

  if (typeof document === "undefined") {
    return overlay;
  }

  return createPortal(overlay, document.body);
}
