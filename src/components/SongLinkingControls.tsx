interface SongLinkingControlsProps {
  canLink: boolean;
  canBreak: boolean;
  onLinkSongs: () => void;
  onBreakLinks: () => void;
}

/**
 * Editor Mode–only Song Linking actions.
 * Must be mounted with `{editorMode && <SongLinkingControls ... />}` so it
 * is not present in the DOM during Performance Mode.
 */
export default function SongLinkingControls({
  canLink,
  canBreak,
  onLinkSongs,
  onBreakLinks,
}: SongLinkingControlsProps) {
  return (
    <div className="playlist-link-actions">
      <button
        type="button"
        className="playlist-link-actions__button"
        disabled={!canLink}
        onClick={onLinkSongs}
        title="Link selected songs to play in sequence"
      >
        Link Songs
      </button>
      <button
        type="button"
        className="playlist-link-actions__button"
        disabled={!canBreak}
        onClick={onBreakLinks}
        title="Remove selected songs from any song link chain"
      >
        Break Link
      </button>
    </div>
  );
}

interface SongLinkCheckboxProps {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

/** Per-song multi-select checkbox for linking. Editor Mode only. */
export function SongLinkCheckbox({
  checked,
  disabled,
  onToggle,
}: SongLinkCheckboxProps) {
  return (
    <input
      type="checkbox"
      className="playlist-item__check"
      checked={checked}
      disabled={disabled}
      title={disabled ? "Add to show playlist first" : "Select for linking"}
      onChange={onToggle}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
