import { useEffect, useRef } from "react";
import {
  KEYBOARD_SHORTCUTS,
  type ShortcutHandlers,
  type ShortcutId,
} from "../keyboard/shortcuts";
import { SEEK_COOLDOWN_MS } from "../utils/safeVideoSeek";

/**
 * True only when Space should insert text / stay with the field —
 * not for buttons, checkboxes, selects, or other focusable chrome.
 */
export function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;

  if (target instanceof HTMLTextAreaElement) {
    return !target.disabled && !target.readOnly;
  }

  if (target instanceof HTMLInputElement) {
    if (target.disabled || target.readOnly) return false;

    const type = (target.type || "text").toLowerCase();
    return (
      type === "text" ||
      type === "search" ||
      type === "email" ||
      type === "url" ||
      type === "tel" ||
      type === "password" ||
      type === "number" ||
      type === "date" ||
      type === "datetime-local" ||
      type === "month" ||
      type === "week" ||
      type === "time"
    );
  }

  return false;
}

const RATE_LIMITED_SHORTCUTS = new Set<ShortcutId>([
  "previousSong",
  "nextSong",
]);

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const lastFiredAtRef = useRef<Partial<Record<ShortcutId, number>>>({});
  /** After Space play/pause on keydown, suppress keyup so focused buttons do not activate. */
  const suppressSpaceKeyUpRef = useRef(false);

  useEffect(() => {
    const claimEvent = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEditingTarget(event.target)) return;

      for (const shortcut of KEYBOARD_SHORTCUTS) {
        const handler = handlers[shortcut.id];
        if (!handler || !shortcut.match(event)) continue;

        // Held Space must not rapid-fire play/pause.
        if (shortcut.id === "playPause" && event.repeat) {
          claimEvent(event);
          break;
        }

        if (shortcut.preventDefault) {
          claimEvent(event);
        }

        if (shortcut.id === "playPause") {
          suppressSpaceKeyUpRef.current = true;
        }

        if (RATE_LIMITED_SHORTCUTS.has(shortcut.id)) {
          const now = Date.now();
          const lastFired = lastFiredAtRef.current[shortcut.id] ?? 0;

          if (now - lastFired < SEEK_COOLDOWN_MS) {
            break;
          }

          lastFiredAtRef.current[shortcut.id] = now;
        }

        handler();
        break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (!suppressSpaceKeyUpRef.current) return;

      suppressSpaceKeyUpRef.current = false;

      if (isTextEditingTarget(event.target)) return;

      // Buttons activate on Space keyup — block that after transport handled keydown.
      claimEvent(event);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, [handlers]);
}
