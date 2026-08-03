import "./App.css";
import ControlBar from "./components/ControlBar";
import CuePanel from "./components/CuePanel";
import Header from "./components/Header";
import PlaylistPanel from "./components/PlaylistPanel";
import VideoPlayer from "./components/VideoPlayer.tsx";
import { useShowDirector } from "./hooks/useShowDirector";

function App() {
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

  return (
    <div className="app">
      <Header currentTime={currentTime} />

      <main className="content">
        <PlaylistPanel
          songs={playlist}
          activeIndex={activeSongIndex}
          onSelect={selectSong}
        />

        <VideoPlayer src={activeVideoSrc} onTimeUpdate={handleTimeUpdate} />

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
