export type ShortcutCategory = "playback" | "director" | "editor" | "ui";

export type ShortcutId =
  | "playPause"
  | "previousSong"
  | "nextSong"
  | "fullscreen"
  | "exitFullscreen"
  | "toggleShortcuts";

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

    if (
      modifiers.shiftKey !== undefined &&
      event.shiftKey !== modifiers.shiftKey
    ) {
      return false;
    }

    if (modifiers.altKey !== undefined && event.altKey !== modifiers.altKey) {
      return false;
    }

    if (modifiers.ctrlKey !== undefined && event.ctrlKey !== modifiers.ctrlKey) {
      return false;
    }

    if (modifiers.metaKey !== undefined && event.metaKey !== modifiers.metaKey) {
      return false;
    }

    return true;
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
    keys: ["←"],
    match: matchKey("ArrowLeft"),
    preventDefault: true,
  },
  {
    id: "nextSong",
    category: "playback",
    label: "Next Song",
    keys: ["→"],
    match: matchKey("ArrowRight"),
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
