import { memo, type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  pickMediaDirectory,
  supportsMediaDirectoryPicker,
} from "../media/loadMediaDirectory";

export type AppWorkspace = "director" | "setlist";

interface MenuBarProps {
  onNewShow: () => void | Promise<void>;
  onSaveShow: () => void | Promise<void>;
  onSaveShowAs: () => void | Promise<void>;
  onOpenShowFile: (file: File) => Promise<boolean>;
  onTryAutoRestorePendingShow: () => Promise<{
    restored: boolean;
    timelineZoom?: number;
    needsMediaPicker: boolean;
  }>;
  onConnectMediaPath: (directoryPath: string) => Promise<number | undefined>;
  onConnectMediaDirectory: (
    directoryHandle: FileSystemDirectoryHandle,
  ) => Promise<number | undefined>;
  onConnectMediaFolder: (files: FileList) => Promise<number | undefined>;
  onCancelOpenShow: () => void;
  onClearLastShow: () => void | Promise<void>;
  onAddVideosToLibrary: () => void | Promise<void>;
  onLockShow: () => void;
  onShowReady: () => void;
  onEndShow: () => void;
  onResetShowTimer: () => void;
  onShowRestored: (timelineZoom?: number) => void;
  canSaveShow: boolean;
  canAddVideos: boolean;
  directorMode: boolean;
  performanceLocked: boolean;
  showLive: boolean;
  canResetShowTimer: boolean;
  showReadyActive: boolean;
  workspace: AppWorkspace;
  onWorkspaceChange: (workspace: AppWorkspace) => void;
}

type OpenMenu = "file" | "show" | null;

function MenuBar({
  onNewShow,
  onSaveShow,
  onSaveShowAs,
  onOpenShowFile,
  onTryAutoRestorePendingShow,
  onConnectMediaPath,
  onConnectMediaDirectory,
  onConnectMediaFolder,
  onCancelOpenShow,
  onClearLastShow,
  onAddVideosToLibrary,
  onLockShow,
  onShowReady,
  onEndShow,
  onResetShowTimer,
  onShowRestored,
  canSaveShow,
  canAddVideos,
  directorMode,
  performanceLocked,
  showLive,
  canResetShowTimer,
  showReadyActive,
  workspace,
  onWorkspaceChange,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const showFileInputRef = useRef<HTMLInputElement>(null);
  const mediaFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!openMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openMenu]);

  const handleNewShow = () => {
    setOpenMenu(null);
    if (directorMode) return;
    void onNewShow();
  };

  const handleOpenShow = () => {
    setOpenMenu(null);
    if (directorMode) return;
    showFileInputRef.current?.click();
  };

  const handleSaveShow = () => {
    setOpenMenu(null);
    if (directorMode || !canSaveShow) return;
    void onSaveShow();
  };

  const handleSaveShowAs = () => {
    setOpenMenu(null);
    if (directorMode || !canSaveShow) return;
    void onSaveShowAs();
  };

  const handleShowFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const ready = await onOpenShowFile(file);
    if (!ready) return;

    const autoRestore = await onTryAutoRestorePendingShow();
    if (autoRestore.restored) {
      onShowRestored(autoRestore.timelineZoom);
      if (!autoRestore.needsMediaPicker) return;
      return;
    }

    if (window.electronAPI) {
      const directoryPath = await window.electronAPI.pickMediaDirectory();
      if (!directoryPath) {
        onCancelOpenShow();
        return;
      }

      onShowRestored(await onConnectMediaPath(directoryPath));
      return;
    }

    if (supportsMediaDirectoryPicker()) {
      const directoryHandle = await pickMediaDirectory();
      if (directoryHandle) {
        onShowRestored(await onConnectMediaDirectory(directoryHandle));
      } else {
        onCancelOpenShow();
      }
      return;
    }

    mediaFolderInputRef.current?.click();
  };

  const handleMediaFolderChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    event.target.value = "";

    if (!files || files.length === 0) {
      onCancelOpenShow();
      return;
    }

    onShowRestored(await onConnectMediaFolder(files));
  };

  const handleClearLastShow = () => {
    setOpenMenu(null);
    if (directorMode) return;
    void onClearLastShow();
  };

  const handleAddVideos = () => {
    setOpenMenu(null);
    if (directorMode || !canAddVideos) return;
    void onAddVideosToLibrary();
  };

  const handleLockShow = () => {
    setOpenMenu(null);
    onLockShow();
  };

  const handleEndShow = () => {
    setOpenMenu(null);
    if (!showLive) return;
    onEndShow();
  };

  const handleResetShowTimer = () => {
    setOpenMenu(null);
    if (!canResetShowTimer) return;
    onResetShowTimer();
  };

  return (
    <nav className="menu-bar" aria-label="Application menu" ref={menuRef}>
      <input
        ref={showFileInputRef}
        type="file"
        accept=".show,.cuedirector,application/json"
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

      <span className="menu-bar__brand">CueDirector</span>

      <div className="menu-bar__group">
        <button
          type="button"
          className={`menu-bar__trigger${openMenu === "file" ? " menu-bar__trigger--open" : ""}`}
          aria-haspopup="menu"
          aria-expanded={openMenu === "file"}
          onClick={() =>
            setOpenMenu((current) => (current === "file" ? null : "file"))
          }
        >
          File
        </button>

        {openMenu === "file" && (
          <div className="menu-bar__dropdown" role="menu">
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={directorMode}
              onClick={handleNewShow}
            >
              New Show
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={directorMode}
              onClick={handleOpenShow}
            >
              Open Show...
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={directorMode || !canSaveShow}
              onClick={handleSaveShow}
            >
              Save
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={directorMode || !canSaveShow}
              onClick={handleSaveShowAs}
            >
              Save As...
            </button>
            <hr className="menu-bar__separator" />
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={directorMode || !canAddVideos}
              onClick={handleAddVideos}
            >
              Add Videos to Library
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={directorMode}
              onClick={handleClearLastShow}
            >
              Clear Last Show
            </button>
          </div>
        )}
      </div>

      <div className="menu-bar__group">
        <button
          type="button"
          className={`menu-bar__trigger${openMenu === "show" ? " menu-bar__trigger--open" : ""}`}
          aria-haspopup="menu"
          aria-expanded={openMenu === "show"}
          onClick={() =>
            setOpenMenu((current) => (current === "show" ? null : "show"))
          }
        >
          Show
        </button>

        {openMenu === "show" && (
          <div className="menu-bar__dropdown" role="menu">
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              onClick={handleLockShow}
            >
              Lock Show
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={!showLive}
              onClick={handleEndShow}
            >
              End Show
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-bar__item"
              disabled={!canResetShowTimer}
              onClick={handleResetShowTimer}
            >
              Reset Show Timer
            </button>
          </div>
        )}
      </div>

      <div className="menu-bar__spacer" aria-hidden="true" />

      <div
        className="menu-bar__workspaces"
        role="tablist"
        aria-label="Workspace"
      >
        <button
          type="button"
          role="tab"
          className={`menu-bar__workspace menu-bar__workspace--director${
            workspace === "director" ? " menu-bar__workspace--director-active" : ""
          }`}
          aria-selected={workspace === "director"}
          onClick={() => onWorkspaceChange("director")}
        >
          Director
        </button>
        <button
          type="button"
          role="tab"
          className={`menu-bar__workspace menu-bar__workspace--setlist${
            workspace === "setlist" ? " menu-bar__workspace--setlist-active" : ""
          }`}
          aria-selected={workspace === "setlist"}
          onClick={() => onWorkspaceChange("setlist")}
        >
          Set List
        </button>
      </div>

      <div className="menu-bar__show-controls">
        <button
          type="button"
          className={`menu-bar__workspace menu-bar__workspace--show-ready${
            showReadyActive ? " menu-bar__workspace--show-ready-active" : ""
          }`}
          aria-pressed={showReadyActive}
          onClick={onShowReady}
        >
          Show Ready
        </button>
        <button
          type="button"
          className="menu-bar__lock"
          onClick={onLockShow}
          title={
            performanceLocked
              ? "Unlock Show (⌘/Ctrl+L)"
              : "Lock Show (⌘/Ctrl+L)"
          }
          aria-label={performanceLocked ? "Unlock show" : "Lock show"}
          aria-pressed={performanceLocked}
        >
          <span aria-hidden="true">{performanceLocked ? "🔐" : "🔒"}</span>
        </button>
      </div>
    </nav>
  );
}

export default memo(MenuBar);
