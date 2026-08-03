import { useCallback, useRef } from "react";
import "./App.css";
import ControlBar from "./components/ControlBar";
import CuePanel from "./components/CuePanel";
import CueTimeline from "./components/CueTimeline";
import Header from "./components/Header";
import PlaylistPanel from "./components/PlaylistPanel";
import VideoPlayer, {
  type VideoPlayerHandle,
} from "./components/VideoPlayer.tsx";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useShowDirector } from "./hooks/useShowDirector";

function App() {
  const videoPlayerRef = useRef<VideoPlayerHandle>(null);

  const {
    currentTime,
    cues,
    playlist,
    activeSongIndex,
    activeVideoSrc,
    selectSong,
    loadShow,
    goToPreviousSong,
    goToNextSong,
    handleTimeUpdate,
    advanceOnVideoEnd,
    autoAdvance,
    setAutoAdvance,
    directorMode,
    setDirectorMode,
    canGoPrevious,
    canGoNext,
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

  useKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onPrevious: goToPreviousSong,
    onNext: goToNextSong,
    onToggleFullscreen: handleToggleFullscreen,
    onExitFullscreen: handleExitFullscreen,
  });

  console.log({
    playlist,
    activeSongIndex,
    activeVideoSrc,
  });
  return (
    <div className="app">
      <Header currentTime={currentTime} directorMode={directorMode} />

      <main className="content">
        <PlaylistPanel
          songs={playlist}
          activeIndex={activeSongIndex}
          onSelect={selectSong}
          directorMode={directorMode}
        />

        <VideoPlayer
          ref={videoPlayerRef}
          src={activeVideoSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
        />

        <CuePanel
          currentTime={currentTime}
          cues={cues}
          onCueSeek={handleCueSeek}
          directorMode={directorMode}
        />
      </main>

      <CueTimeline
        cues={cues}
        currentTime={currentTime}
        videoPlayerRef={videoPlayerRef}
      />

      <ControlBar
        onLoadShow={loadShow}
        onPrevious={goToPreviousSong}
        onNext={goToNextSong}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        autoAdvance={autoAdvance}
        onToggleAutoAdvance={() => setAutoAdvance((value) => !value)}
        directorMode={directorMode}
        onToggleDirectorMode={() => setDirectorMode((value) => !value)}
      />
    </div>
  );
}

export default App;
