import { useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { getVideoSeekDelta } from "../utils/videoSeek";
import { isTextEditingTarget } from "./useKeyboardShortcuts";

/**
 * Live-mode arrow key sync nudges (seek playback without editing cues).
 * Runs in capture phase so cue list / button focus never intercepts first.
 */
export function useVideoSeekShortcuts(
  enabled: boolean,
  onSeekByDelta: (delta: number) => void,
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEditingTarget(event.target)) return;

      const delta = getVideoSeekDelta(event.code, event.shiftKey);
      if (delta === null) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onSeekByDelta(delta);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [enabled, onSeekByDelta]);
}

/** Block arrow keys from moving focus between cue sheet controls. */
export function blockArrowKeyFocusNavigation(
  event: ReactKeyboardEvent,
): void {
  if (
    event.key === "ArrowUp" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight"
  ) {
    event.preventDefault();
  }
}
