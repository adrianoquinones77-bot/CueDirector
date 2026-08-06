import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import "./App.css";
import AddCueModal from "./components/AddCueModal";
import ConfirmDeleteCueDialog from "./components/ConfirmDeleteCueDialog";
import ConfirmDeleteSongDialog from "./components/ConfirmDeleteSongDialog";
import ControlBar from "./components/ControlBar";
import CreatePinDialog from "./components/CreatePinDialog";
import CueContextMenu from "./components/CueContextMenu";
import CuePanel from "./components/CuePanel";
import CueTimeline from "./components/CueTimeline";
import EditCueModal from "./components/EditCueModal";
import Header from "./components/Header";
import MenuBar from "./components/MenuBar";
import MissingFilesDialog from "./components/MissingFilesDialog";
import OpenShowErrorDialog from "./components/OpenShowErrorDialog";
import LiveLockShield from "./components/LiveLockShield";
import PerformanceLockScreen from "./components/PerformanceLockScreen";
import PlaylistPanel from "./components/PlaylistPanel";
import ResizeHandle from "./components/ResizeHandle";
import SetListPage from "./components/SetListPage";
import ShowReadyChecklistModal from "./components/ShowReadyChecklistModal";
import Toast, { type ToastMessage } from "./components/Toast";
import VideoPlayer, {
  type VideoPlayerHandle,
} from "./components/VideoPlayer.tsx";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useLastShowPersistence } from "./hooks/useLastShowPersistence";
import { useVideoSeekShortcuts } from "./hooks/useVideoSeekShortcuts";
import { usePanelLayout } from "./hooks/usePanelLayout";
import { useShowDirector } from "./hooks/useShowDirector";
import type { ShortcutHandlers } from "./keyboard/shortcuts";
import { getPlaybackTime } from "./playback/playbackClock";
import {
  endShowClock,
  resetShowClock,
  startShowClock,
  useShowLive,
  useShowSessionActive,
} from "./playback/showClock";
import {
  hasPerformancePin,
  savePerformancePin,
} from "./session/performancePinStorage";
import {
  createCue,
  logNewCueCreated,
  logPlayCue,
  sanitizeCueTime,
} from "./utils/createCue";
import type { Cue } from "./types/cue";
import {
  buildMediaLibraryFromPlaylist,
  mergeMediaLibraries,
} from "./showFile/mediaLibrary";

function App() {
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [addCueTime, setAddCueTime] = useState<number | null>(null);
  const [editCueIndex, setEditCueIndex] = useState<number | null>(null);
  const [selectedCueIndex, setSelectedCueIndex] = useState<number | null>(null);
  const [deleteCueIndex, setDeleteCueIndex] = useState<number | null>(null);
  const [deleteSongId, setDeleteSongId] = useState<string | null>(null);
  const [cueContextMenu, setCueContextMenu] = useState<{
    x: number;
    y: number;
    cueIndex: number;
  } | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [isRelinkingMedia, setIsRelinkingMedia] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [performanceLocked, setPerformanceLocked] = useState(false);
  const [createPinOpen, setCreatePinOpen] = useState(false);
  const [appView, setAppView] = useState<"director" | "setlist">("director");
  /**
   * Show Ready state machine (authenticate once, then stay locked):
   * IDLE → LOCK_AUTH → READY_CHECKLIST → LIVE_LOCKED
   * START SHOW must never return to LOCK_AUTH.
   */
  const [showReadyPhase, setShowReadyPhase] = useState<
    "idle" | "lock_auth" | "ready_checklist" | "live_locked"
  >("idle");
  /** Intentional unlock UI only — never auto-opened by START SHOW. */
  const [unlockPromptOpen, setUnlockPromptOpen] = useState(false);
  const [lockIntent, setLockIntent] = useState<"lock" | "show-ready" | null>(
    null,
  );
  const liveLockedMode = showReadyPhase === "live_locked";
  const showReadyChecklistOpen = showReadyPhase === "ready_checklist";
  const showReadyAwaitingPin = showReadyPhase === "lock_auth";
  const toastIdRef = useRef(0);

  const {
    cues,
    playlist,
    mediaLibrary,
    activeSongIndex,
    activeVideoSrc,
    selectMedia,
    linkSongs,
    breakSongLink,
    deleteSong,
    loadShow,
    loadShowDirectory,
    newShow,
    saveShow,
    saveShowAs,
    openShowFile,
    tryAutoRestorePendingShow,
    connectMediaPath,
    connectMediaFolder,
    connectMediaDirectory,
    cancelOpenShow,
    missingVideoFiles,
    dismissMissingVideoFiles,
    relinkMediaFolder,
    addVideosToLibrary,
    prepareCueVideo,
    openShowError,
    dismissOpenShowError,
    saveCueError,
    dismissSaveCueError,
    goToPreviousSong,
    goToNextSong,
    handleTimeUpdate,
    advanceOnVideoEnd,
    autoAdvance,
    setAutoAdvance,
    directorMode,
    setDirectorMode,
    editorMode,
    setEditorMode,
    addCue,
    updateCue,
    deleteCue,
    defaultCueDuration,
    setDefaultCueDuration,
    showInfo,
    updateShowInfo,
    updateSongSetList,
    recordActiveSongDuration,
    canGoPrevious,
    canGoNext,
    canSaveShow,
    saveCues,
    canSaveCues,
    restoreFromSession,
    clearPersistedShow,
    getMediaDirectoryPath,
    getShowFilePath,
  } = useShowDirector();

  const activeSong =
    activeSongIndex >= 0 ? playlist[activeSongIndex] : undefined;

  const sidebarMediaItems = useMemo(
    () =>
      mergeMediaLibraries(
        mediaLibrary,
        buildMediaLibraryFromPlaylist(playlist),
      ),
    [mediaLibrary, playlist],
  );

  const handleRestoreSession = useCallback(
    async (session: Parameters<typeof restoreFromSession>[0]) => {
      const result = await restoreFromSession(session);
      if (result) {
        setTimelineZoom(result.timelineZoom);
      }
      return result;
    },
    [restoreFromSession],
  );

  const handleClearLastShow = useCallback(async () => {
    await clearPersistedShow();
    resetShowClock();
    setShowReadyPhase("idle");
    setUnlockPromptOpen(false);
    setTimelineZoom(1);
  }, [clearPersistedShow]);

  const applyRestoredTimelineZoom = useCallback((zoom?: number) => {
    if (zoom === undefined) return;
    setTimelineZoom(zoom);
  }, []);

  const showToast = useCallback((tone: ToastMessage["tone"], message: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, tone, message });
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToast((current) => (current?.id === id ? null : current));
  }, []);

  const handleSaveShow = useCallback(async () => {
    const result = await saveShow(timelineZoom);
    if (result === "saved") {
      showToast("success", "Show saved");
    } else if (result === "cancelled") {
      return;
    } else if (result === "empty") {
      showToast("error", "Nothing to save");
    } else {
      showToast("error", "Could not save show");
    }
  }, [saveShow, showToast, timelineZoom]);

  const handleSaveShowAs = useCallback(async () => {
    const result = await saveShowAs(timelineZoom);
    if (result === "saved") {
      showToast("success", "Show saved");
    } else if (result === "cancelled") {
      return;
    } else if (result === "empty") {
      showToast("error", "Nothing to save");
    } else {
      showToast("error", "Could not save show");
    }
  }, [saveShowAs, showToast, timelineZoom]);

  const handleNewShow = useCallback(async () => {
    await newShow();
    resetShowClock();
    setShowReadyPhase("idle");
    setUnlockPromptOpen(false);
    setPerformanceLocked(false);
    setLockIntent(null);
    setTimelineZoom(1);
    setAppView("director");
    showToast("success", "New show");
  }, [newShow, showToast]);

  const handleSaveCues = useCallback(async () => {
    const saved = await saveCues();
    if (saved) {
      showToast("success", "Cues saved successfully");
    } else {
      showToast("error", "Could not save cues");
    }
  }, [saveCues, showToast]);

  useEffect(() => {
    setVideoDuration(0);
  }, [activeVideoSrc]);

  const handleVideoDurationChange = useCallback(
    (duration: number) => {
      setVideoDuration(duration);
      recordActiveSongDuration(duration);
    },
    [recordActiveSongDuration],
  );

  const handleSetListDisplayNameChange = useCallback(
    (songId: string, displayName: string) => {
      updateSongSetList(songId, { displayName });
    },
    [updateSongSetList],
  );

  const handleSetListMedleyPartsChange = useCallback(
    (songId: string, parts: string[]) => {
      updateSongSetList(songId, { parts });
    },
    [updateSongSetList],
  );

  const handleShowRestored = useCallback(
    (timelineZoom?: number) => {
      resetShowClock();
      setShowReadyPhase("idle");
      setUnlockPromptOpen(false);
      applyRestoredTimelineZoom(timelineZoom);
    },
    [applyRestoredTimelineZoom],
  );

  const handleOpenShowFile = useCallback(
    async (file: File) => {
      const opened = await openShowFile(file);
      if (opened) {
        resetShowClock();
        setShowReadyPhase("idle");
        setUnlockPromptOpen(false);
      }
      return opened;
    },
    [openShowFile],
  );

  useLastShowPersistence({
    showInfo,
    autoAdvance,
    defaultCueDuration,
    playlist,
    mediaLibrary,
    activeSongIndex,
    timelineZoom,
    getMediaDirectoryPath,
    getShowFilePath,
    onRestore: handleRestoreSession,
  });

  const handleAddVideosToLibrary = useCallback(async () => {
    const added = await addVideosToLibrary();
    if (added > 0) {
      showToast(
        "success",
        added === 1
          ? "Added 1 video to library"
          : `Added ${added} videos to library`,
      );
    }
  }, [addVideosToLibrary, showToast]);

  const handleRelinkMediaFolder = useCallback(async () => {
    setIsRelinkingMedia(true);
    try {
      await relinkMediaFolder(timelineZoom);
    } finally {
      setIsRelinkingMedia(false);
    }
  }, [relinkMediaFolder, timelineZoom]);

  const panelLayout = usePanelLayout(contentRef);

  useEffect(() => {
    if (!editorMode) {
      setAddCueTime(null);
      setEditCueIndex(null);
      setSelectedCueIndex(null);
      setDeleteCueIndex(null);
      setDeleteSongId(null);
      setCueContextMenu(null);
    }
  }, [editorMode]);

  useEffect(() => {
    setSelectedCueIndex(null);
    setDeleteCueIndex(null);
    setCueContextMenu(null);
  }, [activeSongIndex]);

  const handlePlayPause = useCallback(() => {
    videoPlayerRef.current?.togglePlayPause();
  }, []);

  /** Manual song pick: always reset to the start so Play can restart any song. */
  const handleSelectMedia = useCallback(
    (mediaId: string) => {
      selectMedia(mediaId);
      // Defer until after React applies the new active source.
      queueMicrotask(() => {
        videoPlayerRef.current?.restartFromStart(false);
      });
    },
    [selectMedia],
  );

  const handleToggleFullscreen = useCallback(() => {
    videoPlayerRef.current?.toggleFullscreen();
  }, []);

  const handleExitFullscreen = useCallback(() => {
    videoPlayerRef.current?.exitFullscreen();
  }, []);

  const handleCueSeek = useCallback(
    (time: number, cue?: Cue) => {
      const seekTime = sanitizeCueTime(time);
      logPlayCue(
        cue ?? { time, text: "(unknown)", emoji: undefined },
        seekTime ?? Number.NaN,
        activeVideoSrc,
      );

      if (seekTime === null) {
        console.error("[PLAY CUE] aborted: invalid seek time", time);
        return;
      }

      if (cue) {
        const wasPlaying = !(videoPlayerRef.current?.isPaused() ?? true);
        const { url, didChange } = prepareCueVideo(cue);

        if (!url && !activeVideoSrc) {
          console.error("[PLAY CUE] aborted: no video reference");
          return;
        }

        if (didChange) {
          videoPlayerRef.current?.prepareSeekAfterLoad(seekTime, wasPlaying);
          return;
        }
      }

      if (!activeVideoSrc) {
        console.error("[PLAY CUE] aborted: no video reference");
        return;
      }

      videoPlayerRef.current?.seekTo(seekTime);
    },
    [activeVideoSrc, prepareCueVideo],
  );

  const handleVideoEnded = useCallback(() => {
    const result = advanceOnVideoEnd();

    if (result.advanced) {
      if (result.autoPlay) {
        // Linked medley: load next song and continue playback automatically.
        videoPlayerRef.current?.prepareSeekAfterLoad(0, true);
        return;
      }

      // Classic auto-advance: land on the next song paused at the start.
      videoPlayerRef.current?.prepareSeekAfterLoad(0, false);
      videoPlayerRef.current?.pause();
      return;
    }

    // End of chain / no advance: rewind so this song stays manually replayable.
    videoPlayerRef.current?.seekTo(0);
  }, [advanceOnVideoEnd]);

  const handleAddCueClick = useCallback(() => {
    const rawTime =
      videoPlayerRef.current?.getCurrentTime() ?? getPlaybackTime();
    const time = sanitizeCueTime(rawTime);
    if (time === null) {
      console.error("[NEW CUE CREATED] aborted: invalid capture time", rawTime);
      return;
    }
    setAddCueTime(time);
  }, []);

  const handleSaveCue = useCallback(
    (
      cueName: string,
      emoji: string,
      type?: Cue["type"],
      important?: boolean,
    ) => {
      if (addCueTime === null) return;

      const cue = createCue({
        time: addCueTime,
        text: cueName,
        emoji,
        type,
        important,
      });

      if (!cue) {
        console.error("[NEW CUE CREATED] aborted: invalid cue data", {
          time: addCueTime,
          text: cueName,
          emoji,
        });
        return;
      }

      logNewCueCreated(cue);
      addCue(cue);
      setAddCueTime(null);
    },
    [addCue, addCueTime],
  );

  const handleToggleCueImportant = useCallback(
    (index: number) => {
      const cue = cues[index];
      if (!cue) return;

      if (cue.important === true) {
        const { important: _removed, ...rest } = cue;
        updateCue(index, rest);
        return;
      }

      updateCue(index, { ...cue, important: true });
    },
    [cues, updateCue],
  );

  const handleCancelAddCue = useCallback(() => {
    setAddCueTime(null);
  }, []);

  const handleEditCue = useCallback((index: number) => {
    setEditCueIndex(index);
    setSelectedCueIndex(index);
    setCueContextMenu(null);
  }, []);

  const handleSelectCue = useCallback((index: number) => {
    setSelectedCueIndex(index);
  }, []);

  const handleUpdateCueTime = useCallback(
    (index: number, time: number) => {
      const cue = cues[index];
      if (!cue) return;
      const nextTime = sanitizeCueTime(time);
      if (nextTime === null) return;
      updateCue(index, { ...cue, time: nextTime });
    },
    [cues, updateCue],
  );

  const handleCueContextMenu = useCallback(
    (index: number, event: MouseEvent) => {
      if (!editorMode) return;

      setCueContextMenu({
        x: event.clientX,
        y: event.clientY,
        cueIndex: index,
      });
    },
    [editorMode],
  );

  const handleRequestDeleteCue = useCallback((index: number) => {
    setEditCueIndex(null);
    setDeleteCueIndex(index);
    setCueContextMenu(null);
  }, []);

  const handleConfirmDeleteCue = useCallback(() => {
    if (deleteCueIndex === null) return;

    deleteCue(deleteCueIndex);
    setSelectedCueIndex((previous) => {
      if (previous === null) return null;
      if (previous === deleteCueIndex) return null;
      if (previous > deleteCueIndex) return previous - 1;
      return previous;
    });
    setDeleteCueIndex(null);
  }, [deleteCueIndex, deleteCue]);

  const handleCancelDeleteCue = useCallback(() => {
    setDeleteCueIndex(null);
  }, []);

  const handleRequestDeleteSong = useCallback((songId: string) => {
    if (!editorMode) return;
    setDeleteSongId(songId);
  }, [editorMode]);

  const handleConfirmDeleteSong = useCallback(() => {
    if (deleteSongId === null) return;
    const deleted = deleteSong(deleteSongId);
    setDeleteSongId(null);
    if (deleted) {
      setSelectedCueIndex(null);
      setEditCueIndex(null);
      setDeleteCueIndex(null);
      setCueContextMenu(null);
      showToast("success", "Song removed from show");
    }
  }, [deleteSong, deleteSongId, showToast]);

  const handleCancelDeleteSong = useCallback(() => {
    setDeleteSongId(null);
  }, []);

  const handleSaveEditedCue = useCallback(
    (cue: Cue) => {
      if (editCueIndex === null) return;
      const sanitized = createCue(cue);
      if (!sanitized) {
        console.error("[NEW CUE CREATED] aborted: invalid edited cue", cue);
        return;
      }
      logNewCueCreated(sanitized);
      updateCue(editCueIndex, sanitized);
      setEditCueIndex(null);
    },
    [editCueIndex, updateCue],
  );

  const handleDeleteEditedCue = useCallback(() => {
    if (editCueIndex === null) return;
    handleRequestDeleteCue(editCueIndex);
  }, [editCueIndex, handleRequestDeleteCue]);

  useEffect(() => {
    if (!editorMode) return;
    if (
      deleteCueIndex !== null ||
      editCueIndex !== null ||
      addCueTime !== null ||
      cueContextMenu !== null
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (selectedCueIndex === null) return;

      event.preventDefault();
      setDeleteCueIndex(selectedCueIndex);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    editorMode,
    selectedCueIndex,
    deleteCueIndex,
    editCueIndex,
    addCueTime,
    cueContextMenu,
  ]);

  const handleVideoSeekByDelta = useCallback((delta: number) => {
    const player = videoPlayerRef.current;
    if (!player) return;

    player.seekTo(player.getCurrentTime() + delta);
  }, []);

  const engagePerformanceLock = useCallback(() => {
    videoPlayerRef.current?.pause();
    setShortcutsOpen(false);
    setCreatePinOpen(false);
    setAddCueTime(null);
    setEditCueIndex(null);
    setDeleteCueIndex(null);
    setCueContextMenu(null);
    setPerformanceLocked(true);
  }, []);

  const handleLockShow = useCallback(() => {
    // Already locked (e.g. live): Lock button intentionally opens PIN to unlock.
    if (performanceLocked) {
      setUnlockPromptOpen(true);
      return;
    }

    setLockIntent("lock");
    if (!hasPerformancePin()) {
      setCreatePinOpen(true);
      return;
    }

    engagePerformanceLock();
    setLockIntent(null);
  }, [engagePerformanceLock, performanceLocked]);

  const handleShowReady = useCallback(() => {
    setAppView("director");

    // Already mid-workflow or live — never re-enter LOCK_AUTH.
    if (
      showReadyPhase === "lock_auth" ||
      showReadyPhase === "ready_checklist" ||
      showReadyPhase === "live_locked" ||
      createPinOpen
    ) {
      return;
    }

    setLockIntent("show-ready");

    if (!hasPerformancePin()) {
      setCreatePinOpen(true);
      return;
    }

    // IDLE → LOCK_AUTH (PIN once)
    setShowReadyPhase("lock_auth");
    setUnlockPromptOpen(false);
    if (!performanceLocked) {
      engagePerformanceLock();
    }
  }, [
    createPinOpen,
    engagePerformanceLock,
    performanceLocked,
    showReadyPhase,
  ]);

  const handleCreatePin = useCallback(
    (pin: string) => {
      savePerformancePin(pin);
      setCreatePinOpen(false);

      if (lockIntent === "show-ready") {
        setLockIntent(null);
        // Creating the PIN authenticates this session — skip LOCK_AUTH.
        engagePerformanceLock();
        setUnlockPromptOpen(false);
        setShowReadyPhase("ready_checklist");
        return;
      }

      engagePerformanceLock();
      setLockIntent(null);
    },
    [engagePerformanceLock, lockIntent],
  );

  const handleUnlockShow = useCallback(() => {
    // LOCK_AUTH → READY_CHECKLIST (stay locked; do not clear the session)
    if (showReadyPhase === "lock_auth") {
      setUnlockPromptOpen(false);
      setShowReadyPhase("ready_checklist");
      return;
    }

    // Full unlock (manual lock or intentional unlock from LIVE_LOCKED)
    setShowReadyPhase("idle");
    setUnlockPromptOpen(false);
    setLockIntent(null);
    setPerformanceLocked(false);
  }, [showReadyPhase]);

  const handleToggleShortcuts = useCallback(() => {
    setShortcutsOpen((open) => !open);
  }, []);

  const showLive = useShowLive();
  const showSessionActive = useShowSessionActive();

  const handleStartShow = useCallback(() => {
    // READY_CHECKLIST → LIVE_LOCKED only.
    // Never opens PIN, never resets auth, never sets unlockPromptOpen.
    setShowReadyPhase("live_locked");
    setUnlockPromptOpen(false);
    setLockIntent(null);
    setAppView("director");
    startShowClock();
  }, []);

  const handleEndShow = useCallback(() => {
    endShowClock();
    // Keep LIVE_LOCKED session / auth; only stop the timer.
  }, []);

  const handleResetShowTimer = useCallback(() => {
    resetShowClock();
    // Timer reset must not tear down the locked live session or reopen PIN.
  }, []);

  const handleToggleAutoAdvance = useCallback(() => {
    setAutoAdvance((value) => !value);
  }, [setAutoAdvance]);

  const handleToggleDirectorMode = useCallback(() => {
    setDirectorMode((value) => !value);
  }, [setDirectorMode]);

  const handleToggleEditorMode = useCallback(() => {
    setEditorMode((value) => !value);
  }, [setEditorMode]);

  // Normalize show fields so the lock screen never receives undefined values.
  const lockShowInfo = useMemo(
    () => ({
      showName: showInfo?.showName ?? "",
      venue: showInfo?.venue ?? "",
      city: showInfo?.city ?? "",
      country: showInfo?.country ?? "",
      date: showInfo?.date ?? "",
      artist: showInfo?.artist ?? "",
      director: showInfo?.director ?? "",
    }),
    [showInfo],
  );

  const shortcutHandlers = useMemo<ShortcutHandlers>(() => {
    // PIN / checklist lock: no shortcuts. Live locked: Director transport stays on.
    if (performanceLocked && !liveLockedMode) {
      return {};
    }

    // Director / live: Space is always global transport (any panel focus).
    // Editor keeps the same Space binding so play/pause stays available.
    return {
      playPause: handlePlayPause,
      previousSong: goToPreviousSong,
      nextSong: goToNextSong,
      fullscreen: handleToggleFullscreen,
      exitFullscreen: handleExitFullscreen,
      toggleShortcuts: handleToggleShortcuts,
      lockShow: handleLockShow,
      saveShow: () => {
        if (directorMode || !canSaveShow) return;
        void handleSaveShow();
      },
      saveShowAs: () => {
        if (directorMode || !canSaveShow) return;
        void handleSaveShowAs();
      },
    };
  }, [
    performanceLocked,
    liveLockedMode,
    directorMode,
    canSaveShow,
    handlePlayPause,
    goToPreviousSong,
    goToNextSong,
    handleToggleFullscreen,
    handleExitFullscreen,
    handleToggleShortcuts,
    handleLockShow,
    handleSaveShow,
    handleSaveShowAs,
  ]);

  // Arrow seeking stays off in Editor Mode; Space transport stays on via shortcuts.
  // Live locked mode keeps seek shortcuts (global Director operation).
  useVideoSeekShortcuts(
    !editorMode && (!performanceLocked || liveLockedMode),
    handleVideoSeekByDelta,
  );

  useKeyboardShortcuts(shortcutHandlers);

  const handleCancelEditCue = useCallback(() => {
    setEditCueIndex(null);
  }, []);

  const canAddCue = activeSongIndex >= 0 || playlist.length === 0;

  const editingCue =
    editCueIndex !== null ? cues[editCueIndex] : undefined;
  const deletingCue =
    deleteCueIndex !== null ? cues[deleteCueIndex] : undefined;
  const deletingSong =
    deleteSongId !== null
      ? playlist.find((song) => song.id === deleteSongId)
      : undefined;

  return (
    <div
      className={`app${editorMode ? " app--editor" : " app--live"}${
        performanceLocked ? " app--performance-locked" : ""
      }`}
    >
      <MenuBar
        onNewShow={handleNewShow}
        onSaveShow={handleSaveShow}
        onSaveShowAs={handleSaveShowAs}
        onOpenShowFile={handleOpenShowFile}
        onTryAutoRestorePendingShow={tryAutoRestorePendingShow}
        onConnectMediaPath={connectMediaPath}
        onConnectMediaDirectory={connectMediaDirectory}
        onConnectMediaFolder={connectMediaFolder}
        onCancelOpenShow={cancelOpenShow}
        onClearLastShow={handleClearLastShow}
        onAddVideosToLibrary={handleAddVideosToLibrary}
        onLockShow={handleLockShow}
        onShowReady={handleShowReady}
        onEndShow={handleEndShow}
        onResetShowTimer={handleResetShowTimer}
        onShowRestored={handleShowRestored}
        canSaveShow={canSaveShow}
        canAddVideos={!directorMode}
        directorMode={directorMode}
        performanceLocked={performanceLocked}
        showLive={showLive}
        canResetShowTimer={showSessionActive}
        showReadyActive={
          showReadyPhase === "lock_auth" ||
          showReadyPhase === "ready_checklist" ||
          showReadyPhase === "live_locked" ||
          lockIntent === "show-ready"
        }
        workspace={appView}
        onWorkspaceChange={setAppView}
      />

      {/* Keep Director workspace mounted so switching never interrupts playback. */}
      <div
        className={`app-view${appView === "director" ? "" : " app-view--hidden"}`}
        aria-hidden={appView !== "director"}
      >
        <Header
          showInfo={showInfo}
          onShowInfoChange={updateShowInfo}
          activeSongIndex={activeSongIndex}
          totalSongs={playlist.length}
          directorMode={directorMode}
          editorMode={editorMode}
          shortcutHandlers={shortcutHandlers}
          shortcutsOpen={shortcutsOpen}
          onToggleShortcuts={handleToggleShortcuts}
        />

        <main
          className={`content${editorMode ? " content--editor" : " content--live"}`}
          ref={contentRef}
        >
          <PlaylistPanel
            mediaItems={sidebarMediaItems}
            playlist={playlist}
            activeSongIndex={activeSongIndex}
            onSelectMedia={handleSelectMedia}
            onAddVideo={handleAddVideosToLibrary}
            onLinkSongs={linkSongs}
            onBreakSongLink={breakSongLink}
            onRequestDeleteSong={handleRequestDeleteSong}
            directorMode={directorMode}
            editorMode={editorMode}
            width={panelLayout.playlistWidth}
          />

          <ResizeHandle
            ariaLabel="Resize playlist panel"
            onPointerDown={panelLayout.onPlaylistResizeStart}
          />

          <div className="video-column">
            <div className="video-column__player">
              <VideoPlayer
                ref={videoPlayerRef}
                src={activeVideoSrc}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleVideoDurationChange}
                onEnded={handleVideoEnded}
              />
            </div>

            <CueTimeline
              cues={cues}
              defaultCueDuration={defaultCueDuration}
              videoPlayerRef={videoPlayerRef}
              videoSrc={activeVideoSrc}
              videoDuration={videoDuration}
              directorMode={directorMode}
              editorMode={editorMode}
              selectedCueIndex={editorMode ? selectedCueIndex : null}
              onSelectCue={editorMode ? handleSelectCue : undefined}
              onCueContextMenu={editorMode ? handleCueContextMenu : undefined}
              onUpdateCueTime={editorMode ? handleUpdateCueTime : undefined}
              onCueSeek={handleCueSeek}
              timelineZoom={timelineZoom}
              onTimelineZoomChange={setTimelineZoom}
            />
          </div>

          <ResizeHandle
            ariaLabel="Resize cue panel"
            onPointerDown={panelLayout.onCueRailResizeStart}
          />

          <CuePanel
            cues={cues}
            defaultCueDuration={defaultCueDuration}
            onCueSeek={handleCueSeek}
            videoPlayerRef={videoPlayerRef}
            directorMode={directorMode}
            editorMode={editorMode}
            width={panelLayout.cueRailWidth}
            directorWidth={panelLayout.directorWidth}
            cueSheetWidth={panelLayout.cueSheetWidth}
            onDirectorResizeStart={panelLayout.onDirectorResizeStart}
            onEditCue={handleEditCue}
            selectedCueIndex={editorMode ? selectedCueIndex : null}
            onSelectCue={handleSelectCue}
            onCueContextMenu={handleCueContextMenu}
            onToggleImportant={handleToggleCueImportant}
          />
        </main>

        <ControlBar
          onLoadShowDirectory={loadShowDirectory}
          onLoadShow={loadShow}
          onPlayPause={handlePlayPause}
          onPrevious={goToPreviousSong}
          onNext={goToNextSong}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          autoAdvance={autoAdvance}
          onToggleAutoAdvance={handleToggleAutoAdvance}
          directorMode={directorMode}
          onToggleDirectorMode={handleToggleDirectorMode}
          editorMode={editorMode}
          onToggleEditorMode={handleToggleEditorMode}
          onAddCue={handleAddCueClick}
          canAddCue={canAddCue}
          onSaveCues={handleSaveCues}
          canSaveCues={canSaveCues}
          defaultCueDuration={defaultCueDuration}
          onDefaultCueDurationChange={setDefaultCueDuration}
        />
      </div>

      {appView === "setlist" && (
        <main className="content content--set-list">
          <SetListPage
            showInfo={showInfo}
            playlist={playlist}
            activeSongIndex={activeSongIndex}
            showCompletion={!editorMode}
            onShowInfoChange={updateShowInfo}
            onDisplayNameChange={handleSetListDisplayNameChange}
            onMedleyPartsChange={handleSetListMedleyPartsChange}
            readOnly={performanceLocked}
          />
        </main>
      )}

      {missingVideoFiles.length > 0 && (
        <MissingFilesDialog
          files={missingVideoFiles}
          isRelinking={isRelinkingMedia}
          onRelink={handleRelinkMediaFolder}
          onClose={dismissMissingVideoFiles}
        />
      )}

      {openShowError && (
        <OpenShowErrorDialog
          message={openShowError}
          onClose={dismissOpenShowError}
        />
      )}

      {saveCueError && (
        <OpenShowErrorDialog
          title="Could Not Save Cues"
          message={saveCueError}
          onClose={dismissSaveCueError}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />

      {createPinOpen && (
        <CreatePinDialog
          onSave={handleCreatePin}
          onCancel={() => {
            setCreatePinOpen(false);
            setLockIntent(null);
            if (showReadyPhase === "lock_auth") {
              setShowReadyPhase("idle");
            }
          }}
        />
      )}

      {/* LOCK_AUTH or intentional unlock — blur + PIN card. */}
      {performanceLocked &&
        (showReadyPhase === "lock_auth" || unlockPromptOpen) && (
          <PerformanceLockScreen
            showInfo={lockShowInfo}
            onUnlock={handleUnlockShow}
            hideCard={false}
          />
        )}

      {/* READY_CHECKLIST — blur only, no PIN card. */}
      {performanceLocked &&
        showReadyPhase === "ready_checklist" &&
        !unlockPromptOpen && (
          <PerformanceLockScreen
            showInfo={lockShowInfo}
            onUnlock={handleUnlockShow}
            hideCard
          />
        )}

      {/* LIVE_LOCKED — invisible shield; never shows PIN unless unlockPromptOpen. */}
      {performanceLocked &&
        showReadyPhase === "live_locked" &&
        !unlockPromptOpen && (
          <LiveLockShield onRequestUnlock={() => setUnlockPromptOpen(true)} />
        )}

      {/* Manual Lock only (not Show Ready workflow): unlock card immediately. */}
      {performanceLocked &&
        showReadyPhase === "idle" &&
        !unlockPromptOpen && (
          <PerformanceLockScreen
            showInfo={lockShowInfo}
            onUnlock={handleUnlockShow}
            hideCard={false}
          />
        )}

      {showReadyPhase === "ready_checklist" && (
        <ShowReadyChecklistModal onStartShow={handleStartShow} />
      )}

      {editorMode && addCueTime !== null && !performanceLocked && (
        <AddCueModal
          time={addCueTime}
          onSave={handleSaveCue}
          onCancel={handleCancelAddCue}
        />
      )}

      {editorMode && editingCue && (
        <EditCueModal
          cue={editingCue}
          mediaLibrary={mediaLibrary}
          defaultVideoLabel={
            activeSong?.videoFilename
              ? `Song video (${activeSong.videoFilename})`
              : "Song video (default)"
          }
          onSave={handleSaveEditedCue}
          onDelete={handleDeleteEditedCue}
          onCancel={handleCancelEditCue}
        />
      )}

      {editorMode && deletingCue && (
        <ConfirmDeleteCueDialog
          cue={deletingCue}
          onConfirm={handleConfirmDeleteCue}
          onCancel={handleCancelDeleteCue}
        />
      )}

      {editorMode && deletingSong && (
        <ConfirmDeleteSongDialog
          songTitle={deletingSong.title || deletingSong.videoFilename}
          onConfirm={handleConfirmDeleteSong}
          onCancel={handleCancelDeleteSong}
        />
      )}

      {editorMode && cueContextMenu && (
        <CueContextMenu
          x={cueContextMenu.x}
          y={cueContextMenu.y}
          onEdit={() => handleEditCue(cueContextMenu.cueIndex)}
          onDelete={() => handleRequestDeleteCue(cueContextMenu.cueIndex)}
          onClose={() => setCueContextMenu(null)}
        />
      )}
    </div>
  );
}

export default App;
