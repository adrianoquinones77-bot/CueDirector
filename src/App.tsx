import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import "./App.css";
import AddCueModal from "./components/AddCueModal";
import ConfirmDeleteCueDialog from "./components/ConfirmDeleteCueDialog";
import ControlBar from "./components/ControlBar";
import CueContextMenu from "./components/CueContextMenu";
import CuePanel from "./components/CuePanel";
import CueTimeline from "./components/CueTimeline";
import EditCueModal from "./components/EditCueModal";
import Header from "./components/Header";
import MenuBar from "./components/MenuBar";
import MissingFilesDialog from "./components/MissingFilesDialog";
import OpenShowErrorDialog from "./components/OpenShowErrorDialog";
import PlaylistPanel from "./components/PlaylistPanel";
import ResizeHandle from "./components/ResizeHandle";
import VideoPlayer, {
  type VideoPlayerHandle,
} from "./components/VideoPlayer.tsx";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useLastShowPersistence } from "./hooks/useLastShowPersistence";
import { useVideoSeekShortcuts } from "./hooks/useVideoSeekShortcuts";
import { usePanelLayout } from "./hooks/usePanelLayout";
import { useShowDirector } from "./hooks/useShowDirector";
import type { ShortcutHandlers } from "./keyboard/shortcuts";

function App() {
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [addCueTime, setAddCueTime] = useState<number | null>(null);
  const [editCueIndex, setEditCueIndex] = useState<number | null>(null);
  const [selectedCueIndex, setSelectedCueIndex] = useState<number | null>(null);
  const [deleteCueIndex, setDeleteCueIndex] = useState<number | null>(null);
  const [cueContextMenu, setCueContextMenu] = useState<{
    x: number;
    y: number;
    cueIndex: number;
  } | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [isRelinkingMedia, setIsRelinkingMedia] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  const {
    currentTime,
    cues,
    playlist,
    activeSongIndex,
    activeVideoSrc,
    selectSong,
    loadShow,
    loadShowDirectory,
    saveShow,
    openShowFile,
    tryAutoRestorePendingShow,
    connectMediaPath,
    connectMediaFolder,
    connectMediaDirectory,
    cancelOpenShow,
    missingVideoFiles,
    dismissMissingVideoFiles,
    relinkMediaFolder,
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
    setTimelineZoom(1);
  }, [clearPersistedShow]);

  const applyRestoredTimelineZoom = useCallback((zoom?: number) => {
    if (zoom === undefined) return;
    setTimelineZoom(zoom);
  }, []);

  useEffect(() => {
    setVideoDuration(0);
  }, [activeVideoSrc]);

  const handleVideoDurationChange = useCallback((duration: number) => {
    setVideoDuration(duration);
  }, []);

  const handleShowRestored = useCallback(
    (timelineZoom?: number) => {
      applyRestoredTimelineZoom(timelineZoom);
    },
    [applyRestoredTimelineZoom],
  );

  useLastShowPersistence({
    showInfo,
    autoAdvance,
    defaultCueDuration,
    playlist,
    activeSongIndex,
    currentTime,
    timelineZoom,
    getMediaDirectoryPath,
    getShowFilePath,
    onRestore: handleRestoreSession,
  });

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

  const handleToggleFullscreen = useCallback(() => {
    videoPlayerRef.current?.toggleFullscreen();
  }, []);

  const handleExitFullscreen = useCallback(() => {
    videoPlayerRef.current?.exitFullscreen();
  }, []);

  const handleCueSeek = useCallback((time: number) => {
    videoPlayerRef.current?.seekTo(time);
  }, []);

  const handleVideoEnded = useCallback(() => {
    const advanced = advanceOnVideoEnd();
    if (advanced) {
      videoPlayerRef.current?.pause();
    }
  }, [advanceOnVideoEnd]);

  const handleAddCueClick = useCallback(() => {
    const time = videoPlayerRef.current?.getCurrentTime() ?? currentTime;
    setAddCueTime(time);
  }, [currentTime]);

  const handleSaveCue = useCallback(
    (cueName: string, emoji: string) => {
      if (addCueTime === null) return;
      addCue({ time: addCueTime, text: cueName, emoji });
      setAddCueTime(null);
    },
    [addCue, addCueTime],
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
      updateCue(index, { ...cue, time });
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

  const handleSaveEditedCue = useCallback(
    (cue: { time: number; text: string }) => {
      if (editCueIndex === null) return;
      updateCue(editCueIndex, cue);
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

  const shortcutHandlers = useMemo<ShortcutHandlers>(
    () => ({
      playPause: handlePlayPause,
      previousSong: goToPreviousSong,
      nextSong: goToNextSong,
      fullscreen: handleToggleFullscreen,
      exitFullscreen: handleExitFullscreen,
      toggleShortcuts: () => setShortcutsOpen((open) => !open),
    }),
    [
      handlePlayPause,
      goToPreviousSong,
      goToNextSong,
      handleToggleFullscreen,
      handleExitFullscreen,
    ],
  );

  useVideoSeekShortcuts(!editorMode, handleVideoSeekByDelta);

  useKeyboardShortcuts(shortcutHandlers);

  const handleCancelEditCue = useCallback(() => {
    setEditCueIndex(null);
  }, []);

  const editingCue =
    editCueIndex !== null ? cues[editCueIndex] : undefined;
  const deletingCue =
    deleteCueIndex !== null ? cues[deleteCueIndex] : undefined;

  return (
    <div className={`app${editorMode ? " app--editor" : " app--live"}`}>
      <MenuBar
        onSaveShow={() => saveShow(timelineZoom)}
        onOpenShowFile={openShowFile}
        onTryAutoRestorePendingShow={tryAutoRestorePendingShow}
        onConnectMediaPath={connectMediaPath}
        onConnectMediaDirectory={connectMediaDirectory}
        onConnectMediaFolder={connectMediaFolder}
        onCancelOpenShow={cancelOpenShow}
        onClearLastShow={handleClearLastShow}
        onShowRestored={handleShowRestored}
        canSaveShow={canSaveShow}
        directorMode={directorMode}
      />

      <Header
        currentTime={currentTime}
        showInfo={showInfo}
        onShowInfoChange={updateShowInfo}
        activeSongIndex={activeSongIndex}
        totalSongs={playlist.length}
        directorMode={directorMode}
        editorMode={editorMode}
        shortcutHandlers={shortcutHandlers}
        shortcutsOpen={shortcutsOpen}
        onToggleShortcuts={() => setShortcutsOpen((open) => !open)}
      />

      <main
        className={`content${editorMode ? " content--editor" : " content--live"}`}
        ref={contentRef}
      >
        <PlaylistPanel
          songs={playlist}
          activeIndex={activeSongIndex}
          onSelect={selectSong}
          directorMode={directorMode}
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
            currentTime={currentTime}
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
            timelineZoom={timelineZoom}
            onTimelineZoomChange={setTimelineZoom}
          />
        </div>

        <ResizeHandle
          ariaLabel="Resize cue panel"
          onPointerDown={panelLayout.onCueRailResizeStart}
        />

        <CuePanel
          currentTime={currentTime}
          cues={cues}
          defaultCueDuration={defaultCueDuration}
          onCueSeek={handleCueSeek}
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
        />
      </main>

      <ControlBar
        onLoadShowDirectory={loadShowDirectory}
        onLoadShow={loadShow}
        onPrevious={goToPreviousSong}
        onNext={goToNextSong}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        autoAdvance={autoAdvance}
        onToggleAutoAdvance={() => setAutoAdvance((value) => !value)}
        directorMode={directorMode}
        onToggleDirectorMode={() => setDirectorMode((value) => !value)}
        editorMode={editorMode}
        onToggleEditorMode={() => setEditorMode((value) => !value)}
        onAddCue={handleAddCueClick}
        canAddCue={activeSongIndex >= 0 || playlist.length === 0}
        onSaveCues={saveCues}
        canSaveCues={canSaveCues}
        defaultCueDuration={defaultCueDuration}
        onDefaultCueDurationChange={setDefaultCueDuration}
      />

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

      {editorMode && addCueTime !== null && (
        <AddCueModal
          time={addCueTime}
          onSave={handleSaveCue}
          onCancel={handleCancelAddCue}
        />
      )}

      {editorMode && editingCue && (
        <EditCueModal
          cue={editingCue}
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
