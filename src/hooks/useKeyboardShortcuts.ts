import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleFullscreen: () => void;
  onExitFullscreen: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts({
  onPlayPause,
  onPrevious,
  onNext,
  onToggleFullscreen,
  onExitFullscreen,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      switch (event.code) {
        case "Space":
          event.preventDefault();
          onPlayPause();
          break;
        case "ArrowRight":
          event.preventDefault();
          onNext();
          break;
        case "ArrowLeft":
          event.preventDefault();
          onPrevious();
          break;
        case "KeyF":
          event.preventDefault();
          onToggleFullscreen();
          break;
        case "Escape":
          onExitFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPlayPause, onPrevious, onNext, onToggleFullscreen, onExitFullscreen]);
}
