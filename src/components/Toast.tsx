import { useEffect, useState } from "react";

export type ToastTone = "success" | "error";

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  durationMs?: number;
  onDismiss: (id: number) => void;
}

export default function Toast({
  toast,
  durationMs = 2500,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const fadeTimer = window.setTimeout(() => setVisible(false), durationMs);
    const dismissTimer = window.setTimeout(
      () => onDismiss(toast.id),
      durationMs + 300,
    );

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [toast, durationMs, onDismiss]);

  if (!toast) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      <div
        className={`toast toast--${toast.tone}${visible ? " toast--visible" : ""}`}
        role="status"
      >
        {toast.message}
      </div>
    </div>
  );
}
