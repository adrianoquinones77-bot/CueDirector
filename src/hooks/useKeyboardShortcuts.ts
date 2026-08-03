import { useEffect, useRef } from "react";
import {
  KEYBOARD_SHORTCUTS,
  type ShortcutHandlers,
  type ShortcutId,
} from "../keyboard/shortcuts";
import { SEEK_COOLDOWN_MS } from "../utils/safeVideoSeek";

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

const RATE_LIMITED_SHORTCUTS = new Set<ShortcutId>([
  "previousSong",
  "nextSong",
]);

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const lastFiredAtRef = useRef<Partial<Record<ShortcutId, number>>>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      for (const shortcut of KEYBOARD_SHORTCUTS) {
        const handler = handlers[shortcut.id];
        if (!handler || !shortcut.match(event)) continue;

        if (shortcut.preventDefault) {
          event.preventDefault();
          event.stopPropagation();
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

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handlers]);
}
