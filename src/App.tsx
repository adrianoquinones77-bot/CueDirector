import { useCallback, useMemo, useRef, useState } from "react";
import "./App.css";
import AddCueModal from "./components/AddCueModal";
import ControlBar from "./components/ControlBar";
import CuePanel from "./components/CuePanel";
import CueTimeline from "./components/CueTimeline";
import Header from "./components/Header";
import MenuBar from "./components/MenuBar";
import MissingFilesDialog from "./components/MissingFilesDialog";
import OpenShowErrorDialog from "./components/OpenShowErrorDialog";
import PlaylistPanel from "./components/PlaylistPanel";
import VideoPlayer, {
  type VideoPlayerHandle,
} from "./components/VideoPlayer.tsx";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useShowDirector } from "./hooks/useShowDirector";
import type { ShortcutHandlers } from "./keyboard/shortcuts";

function App() {
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const [addCueTime, setAddCueTime] = useState<number | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
    connectMediaFolder,
    connectMediaDirectory,
    cancelOpenShow,
    missingVideoFiles,
    dismissMissingVideoFiles,
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
    defaultCueDuration,
    setDefaultCueDuration,
    showInfo,
    updateShowInfo,
    canGoPrevious,
    canGoNext,
    canSaveShow,
    saveCues,
    canSaveCues,
  } = useShowDirector();

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
    (cueName: string) => {
      if (addCueTime === null) return;
      addCue({ time: addCueTime, text: cueName });
      setAddCueTime(null);
    },
    [addCue, addCueTime],
  );

  const handleCancelAddCue = useCallback(() => {
    setAddCueTime(null);
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

  useKeyboardShortcuts(shortcutHandlers);

  return (
    <div className="app">
      <MenuBar
        onSaveShow={saveShow}
        onOpenShowFile={openShowFile}
        onConnectMediaDirectory={connectMediaDirectory}
        onConnectMediaFolder={connectMediaFolder}
        onCancelOpenShow={cancelOpenShow}
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
      />

      <main className="content">
        <PlaylistPanel
          songs={playlist}
          activeIndex={activeSongIndex}
          onSelect={selectSong}
          directorMode={directorMode}
        />

        <div className="video-column">
          <VideoPlayer
            ref={videoPlayerRef}
            src={activeVideoSrc}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
          />

          <CueTimeline
            cues={cues}
            currentTime={currentTime}
            defaultCueDuration={defaultCueDuration}
            videoPlayerRef={videoPlayerRef}
          />
        </div>

        <CuePanel
          currentTime={currentTime}
          cues={cues}
          defaultCueDuration={defaultCueDuration}
          onCueSeek={handleCueSeek}
          directorMode={directorMode}
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
        shortcutHandlers={shortcutHandlers}
        shortcutsOpen={shortcutsOpen}
        onToggleShortcuts={() => setShortcutsOpen((open) => !open)}
      />

      {missingVideoFiles.length > 0 && (
        <MissingFilesDialog
          files={missingVideoFiles}
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

      {addCueTime !== null && (
        <AddCueModal
          time={addCueTime}
          onSave={handleSaveCue}
          onCancel={handleCancelAddCue}
        />
      )}
    </div>
  );
}

export default App;
