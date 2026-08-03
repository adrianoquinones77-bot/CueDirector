import {
  SHORTCUT_CATEGORY_LABELS,
  SHORTCUT_CATEGORY_ORDER,
  VIDEO_SEEK_SHORTCUTS,
  type ShortcutCategory,
  type ShortcutHandlers,
  getActiveShortcutsByCategory,
} from "../keyboard/shortcuts";

interface ShortcutsToggleProps {
  open: boolean;
  onToggle: () => void;
}

interface ShortcutsHelpBarProps {
  handlers: ShortcutHandlers;
  editorMode: boolean;
}

/** Categories shown in Live Mode — essential operator shortcuts only. */
const LIVE_SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  "playback",
  "director",
  "ui",
];

function ShortcutEntry({
  shortcut,
}: {
  shortcut: { keys: string[]; label: string; id: string };
}) {
  return (
    <li className="shortcuts-guide__entry">
      <span className="shortcuts-guide__keys" aria-hidden="true">
        {shortcut.keys.map((key) => (
          <kbd key={key} className="shortcuts-guide__kbd">
            {key}
          </kbd>
        ))}
      </span>
      <span className="shortcuts-guide__label">{shortcut.label}</span>
    </li>
  );
}

export function ShortcutsToggle({ open, onToggle }: ShortcutsToggleProps) {
  return (
    <button
      type="button"
      className={`shortcuts-guide__toggle${open ? " shortcuts-guide__toggle--open" : ""}`}
      aria-expanded={open}
      aria-controls="shortcuts-guide-panel"
      onClick={onToggle}
    >
      Shortcuts <span className="shortcuts-guide__hint">?</span>
    </button>
  );
}

export function ShortcutsHelpBar({
  handlers,
  editorMode,
}: ShortcutsHelpBarProps) {
  const grouped = getActiveShortcutsByCategory(handlers);
  const categories = editorMode
    ? SHORTCUT_CATEGORY_ORDER
    : LIVE_SHORTCUT_CATEGORIES;

  return (
    <div
      id="shortcuts-guide-panel"
      className={`shortcuts-bar${editorMode ? " shortcuts-bar--editor" : " shortcuts-bar--live"}`}
      aria-label="Keyboard shortcuts"
    >
      {categories.map((category) => {
        const shortcuts = grouped[category];
        const seekShortcuts =
          !editorMode && category === "playback" ? VIDEO_SEEK_SHORTCUTS : [];
        const entries = [...(shortcuts ?? []), ...seekShortcuts];

        if (entries.length === 0) return null;

        return (
          <section key={category} className="shortcuts-guide__section">
            <h3 className="shortcuts-guide__heading">
              {SHORTCUT_CATEGORY_LABELS[category]}
            </h3>
            <ul className="shortcuts-guide__list">
              {entries.map((shortcut) => (
                <ShortcutEntry key={shortcut.id} shortcut={shortcut} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
