import { useCallback, useRef } from "react";
import "./App.css";
import ControlBar from "./components/ControlBar";
import CuePanel from "./components/CuePanel";
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
      <Header currentTime={currentTime} />

      <main className="content">
        <PlaylistPanel
          songs={playlist}
          activeIndex={activeSongIndex}
          onSelect={selectSong}
        />

        <VideoPlayer
          ref={videoPlayerRef}
          src={activeVideoSrc}
          cues={cues}
          currentTime={currentTime}
          onTimeUpdate={handleTimeUpdate}
        />

        <CuePanel currentTime={currentTime} cues={cues} />
      </main>

      <ControlBar
        onLoadShow={loadShow}
        onPrevious={goToPreviousSong}
        onNext={goToNextSong}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
      />
    </div>
  );
}

export default App;
