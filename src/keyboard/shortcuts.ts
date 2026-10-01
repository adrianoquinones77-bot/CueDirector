export type ShortcutCategory = "playback" | "director" | "editor" | "ui";

export type ShortcutId =
  | "playPause"
  | "previousSong"
  | "nextSong"
  | "fullscreen"
  | "exitFullscreen"
  | "toggleShortcuts"
  | "lockShow"
  | "saveShow"
  | "saveShowAs";

export interface ShortcutDefinition {
  id: ShortcutId;
  category: ShortcutCategory;
  label: string;
  keys: string[];
  match: (event: KeyboardEvent) => boolean;
  preventDefault?: boolean;
}

export const SHORTCUT_CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  playback: "Playback",
  director: "Director",
  editor: "Editor",
  ui: "UI",
};

export const SHORTCUT_CATEGORY_ORDER: ShortcutCategory[] = [
  "playback",
  "director",
  "editor",
  "ui",
];

function matchKey(
  code: string,
  modifiers: {
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
  } = {},
): (event: KeyboardEvent) => boolean {
  return (event) => {
    if (event.code !== code) return false;

    const shiftKey = modifiers.shiftKey ?? false;
    const altKey = modifiers.altKey ?? false;
    const ctrlKey = modifiers.ctrlKey ?? false;
    const metaKey = modifiers.metaKey ?? false;

    return (
      event.shiftKey === shiftKey &&
      event.altKey === altKey &&
      event.ctrlKey === ctrlKey &&
      event.metaKey === metaKey
    );
  };
}

export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: "playPause",
    category: "playback",
    label: "Play/Pause",
    keys: ["Space"],
    match: matchKey("Space"),
    preventDefault: true,
  },
  {
    id: "previousSong",
    category: "playback",
    label: "Previous Song",
    keys: [","],
    match: matchKey("Comma"),
    preventDefault: true,
  },
  {
    id: "nextSong",
    category: "playback",
    label: "Next Song",
    keys: ["."],
    match: matchKey("Period"),
    preventDefault: true,
  },
  {
    id: "fullscreen",
    category: "director",
    label: "Fullscreen",
    keys: ["F"],
    match: matchKey("KeyF"),
    preventDefault: true,
  },
  {
    id: "exitFullscreen",
    category: "director",
    label: "Exit Fullscreen",
    keys: ["Esc"],
    match: matchKey("Escape"),
  },
  {
    id: "toggleShortcuts",
    category: "ui",
    label: "Show/Hide Shortcuts",
    keys: ["?"],
    match: matchKey("Slash", { shiftKey: true }),
    preventDefault: true,
  },
  {
    id: "lockShow",
    category: "ui",
    label: "Lock Show",
    keys: ["⌘/Ctrl", "L"],
    match: (event) =>
      event.code === "KeyL" &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey,
    preventDefault: true,
  },
  {
    id: "saveShow",
    category: "ui",
    label: "Save",
    keys: ["⌘/Ctrl", "S"],
    match: (event) =>
      event.code === "KeyS" &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey,
    preventDefault: true,
  },
  {
    id: "saveShowAs",
    category: "ui",
    label: "Save As…",
    keys: ["⌘/Ctrl", "Shift", "S"],
    match: (event) =>
      event.code === "KeyS" &&
      (event.metaKey || event.ctrlKey) &&
      event.shiftKey &&
      !event.altKey,
    preventDefault: true,
  },
];

/** Documented live-mode video seek shortcuts (keyboard handled in App). */
export interface DisplayShortcut {
  id: string;
  category: ShortcutCategory;
  label: string;
  keys: string[];
}

export const VIDEO_SEEK_SHORTCUTS: DisplayShortcut[] = [
  {
    id: "syncForwardFine",
    category: "playback",
    label: "Sync +0.20s",
    keys: ["→"],
  },
  {
    id: "syncBackwardFine",
    category: "playback",
    label: "Sync −0.20s",
    keys: ["←"],
  },
  {
    id: "syncForwardCoarse",
    category: "playback",
    label: "Sync +1.00s",
    keys: ["Shift", "→"],
  },
  {
    id: "syncBackwardCoarse",
    category: "playback",
    label: "Sync −1.00s",
    keys: ["Shift", "←"],
  },
];

export type ShortcutHandlers = Partial<
  Record<ShortcutId, () => void>
>;

export function getShortcutsByCategory(
  shortcuts: ShortcutDefinition[] = KEYBOARD_SHORTCUTS,
): Partial<Record<ShortcutCategory, ShortcutDefinition[]>> {
  const grouped: Partial<Record<ShortcutCategory, ShortcutDefinition[]>> = {};

  for (const shortcut of shortcuts) {
    if (!grouped[shortcut.category]) {
      grouped[shortcut.category] = [];
    }

    grouped[shortcut.category]?.push(shortcut);
  }

  return grouped;
}

export function getActiveShortcuts(
  handlers: ShortcutHandlers,
  shortcuts: ShortcutDefinition[] = KEYBOARD_SHORTCUTS,
): ShortcutDefinition[] {
  return shortcuts.filter((shortcut) => handlers[shortcut.id] !== undefined);
}

export function getActiveShortcutsByCategory(
  handlers: ShortcutHandlers,
): Partial<Record<ShortcutCategory, ShortcutDefinition[]>> {
  return getShortcutsByCategory(getActiveShortcuts(handlers));
}
