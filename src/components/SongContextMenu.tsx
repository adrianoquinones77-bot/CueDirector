import { useEffect, useRef } from "react";

interface SongContextMenuProps {
  x: number;
  y: number;
  onImportCueFile: () => void;
  onClose: () => void;
}

export default function SongContextMenu({
  x,
  y,
  onImportCueFile,
  onClose,
}: SongContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const padding = 8;
    let left = x;
    let top = y;

    if (left + rect.width > window.innerWidth - padding) {
      left = window.innerWidth - rect.width - padding;
    }

    if (top + rect.height > window.innerHeight - padding) {
      top = window.innerHeight - rect.height - padding;
    }

    menu.style.left = `${Math.max(padding, left)}px`;
    menu.style.top = `${Math.max(padding, top)}px`;
  }, [x, y]);

  return (
    <>
      <div
        className="cue-context-menu-backdrop"
        role="presentation"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        className="cue-context-menu"
        role="menu"
        style={{ left: x, top: y }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="cue-context-menu__item"
          role="menuitem"
          onClick={() => {
            onImportCueFile();
            onClose();
          }}
        >
          Import Cue File…
        </button>
      </div>
    </>
  );
}
