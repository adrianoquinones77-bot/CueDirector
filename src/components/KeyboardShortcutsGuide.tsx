import {
  SHORTCUT_CATEGORY_LABELS,
  SHORTCUT_CATEGORY_ORDER,
  type ShortcutDefinition,
  type ShortcutHandlers,
  getActiveShortcutsByCategory,
} from "../keyboard/shortcuts";

interface KeyboardShortcutsGuideProps {
  handlers: ShortcutHandlers;
  open: boolean;
  onToggle: () => void;
}

function ShortcutEntry({ shortcut }: { shortcut: ShortcutDefinition }) {
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

export default function KeyboardShortcutsGuide({
  handlers,
  open,
  onToggle,
}: KeyboardShortcutsGuideProps) {
  const grouped = getActiveShortcutsByCategory(handlers);

  return (
    <div className="shortcuts-guide">
      <button
        type="button"
        className={`shortcuts-guide__toggle${open ? " shortcuts-guide__toggle--open" : ""}`}
        aria-expanded={open}
        aria-controls="shortcuts-guide-panel"
        onClick={onToggle}
      >
        Shortcuts
      </button>

      {open && (
        <div
          id="shortcuts-guide-panel"
          className="shortcuts-guide__panel"
          aria-label="Keyboard shortcuts"
        >
          {SHORTCUT_CATEGORY_ORDER.map((category) => {
            const shortcuts = grouped[category];
            if (!shortcuts || shortcuts.length === 0) return null;

            return (
              <section key={category} className="shortcuts-guide__section">
                <h3 className="shortcuts-guide__heading">
                  {SHORTCUT_CATEGORY_LABELS[category]}
                </h3>
                <ul className="shortcuts-guide__list">
                  {shortcuts.map((shortcut) => (
                    <ShortcutEntry key={shortcut.id} shortcut={shortcut} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
