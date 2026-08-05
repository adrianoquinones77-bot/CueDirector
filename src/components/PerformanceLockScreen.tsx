import {
  type FormEvent,
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { ShowInfo } from "../types/showInfo";
import { verifyPerformancePin } from "../session/performancePinStorage";

interface PerformanceLockScreenProps {
  showInfo: ShowInfo;
  onUnlock: () => void;
  /**
   * When true: blur-only overlay — no card, no PIN, no unlock chrome.
   * Used during Show Ready checklist and after START SHOW (live locked).
   */
  hideCard?: boolean;
}

function displayValue(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function LockScreenContent({
  showInfo,
  onUnlock,
}: {
  showInfo: ShowInfo;
  onUnlock: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!verifyPerformancePin(pin)) {
      setError("Incorrect PIN");
      setPin("");
      inputRef.current?.focus();
      return;
    }

    onUnlock();
  };

  return (
    <form className="performance-lock__card" onSubmit={handleSubmit}>
      <div className="performance-lock__brand">
        <div className="performance-lock__logo" aria-hidden="true">
          CD
        </div>
        <h1 className="performance-lock__product">CueDirector</h1>
        <p className="performance-lock__byline">Performance Lock</p>
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
        Unlock
      </button>
    </form>
  );
}

function FallbackUnlockScreen({ onUnlock }: { onUnlock: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!verifyPerformancePin(pin)) {
      setError("Incorrect PIN");
      setPin("");
      return;
    }
    onUnlock();
  };

  return (
    <form className="performance-lock__fallback" onSubmit={handleSubmit}>
      <h1>CueDirector Locked</h1>
      <p>Enter PIN to unlock</p>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        maxLength={6}
        onChange={(event) => {
          setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
          setError(null);
        }}
      />
      {error && <p className="performance-lock__error">{error}</p>}
      <button type="submit">Unlock</button>
    </form>
  );
}

interface LockErrorBoundaryProps {
  onUnlock: () => void;
  children: ReactNode;
}

interface LockErrorBoundaryState {
  hasError: boolean;
}

class LockErrorBoundary extends Component<
  LockErrorBoundaryProps,
  LockErrorBoundaryState
> {
  state: LockErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LockErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[PerformanceLock] render failed", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <FallbackUnlockScreen onUnlock={this.props.onUnlock} />;
    }
    return this.props.children;
  }
}

export default function PerformanceLockScreen({
  showInfo,
  onUnlock,
  hideCard = false,
}: PerformanceLockScreenProps) {
  const overlay = (
    <div
      className={`performance-lock${hideCard ? " performance-lock--transparent" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={hideCard ? "Show locked — live" : "Show locked"}
    >
      {!hideCard && (
        <LockErrorBoundary onUnlock={onUnlock}>
          <LockScreenContent showInfo={showInfo} onUnlock={onUnlock} />
        </LockErrorBoundary>
      )}
    </div>
  );

  if (typeof document === "undefined") {
    return overlay;
  }

  return createPortal(overlay, document.body);
}
