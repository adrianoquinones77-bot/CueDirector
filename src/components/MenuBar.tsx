import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  pickMediaDirectory,
  supportsMediaDirectoryPicker,
} from "../media/loadMediaDirectory";

interface MenuBarProps {
  onSaveShow: () => void;
  onOpenShowFile: (file: File) => Promise<boolean>;
  onConnectMediaDirectory: (
    directoryHandle: FileSystemDirectoryHandle,
  ) => Promise<void>;
  onConnectMediaFolder: (files: FileList) => void;
  onCancelOpenShow: () => void;
  canSaveShow: boolean;
  directorMode: boolean;
}

export default function MenuBar({
  onSaveShow,
  onOpenShowFile,
  onConnectMediaDirectory,
  onConnectMediaFolder,
  onCancelOpenShow,
  canSaveShow,
  directorMode,
}: MenuBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const showFileInputRef = useRef<HTMLInputElement>(null);
  const mediaFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const handleOpenShow = () => {
    setMenuOpen(false);
    if (directorMode) return;
    showFileInputRef.current?.click();
  };

  const handleSaveShow = () => {
    setMenuOpen(false);
    if (directorMode || !canSaveShow) return;
    onSaveShow();
  };

  const handleShowFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const ready = await onOpenShowFile(file);
    if (ready) {
      if (supportsMediaDirectoryPicker()) {
        const directoryHandle = await pickMediaDirectory();
        if (directoryHandle) {
          await onConnectMediaDirectory(directoryHandle);
        } else {
          onCancelOpenShow();
        }
        return;
      }

      mediaFolderInputRef.current?.click();
    }
  };

  const handleMediaFolderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    event.target.value = "";

    if (!files || files.length === 0) {
      onCancelOpenShow();
      return;
    }

    onConnectMediaFolder(files);
  };

  return (
    <nav className="menu-bar" aria-label="Application menu">
      <input
        ref={showFileInputRef}
        type="file"
        accept=".cuedirector,application/json"
        style={{ display: "none" }}
        onChange={handleShowFileChange}
      />

      <input
        ref={mediaFolderInputRef}
        type="file"
        style={{ display: "none" }}
        // @ts-expect-error webkitdirectory is supported in Chromium/Safari
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleMediaFolderChange}
      />

      <div className="menu-bar__group" ref={menuRef}>
        <button
          type="button"
          className={`menu-bar__trigger${menuOpen ? " menu-bar__trigger--open" : ""}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          File
        </button>

        {menuOpen && (
          <div className="menu-bar__dropdown" role="menu">
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={directorMode || !canSaveShow}
              onClick={handleSaveShow}
            >
              Save Show
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={directorMode}
              onClick={handleOpenShow}
            >
              Open Show
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
