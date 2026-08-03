import { type ChangeEvent, useRef, useState } from "react";
import "./App.css";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState(0);

  const handleLoadVideo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !videoRef.current) return;

    const url = URL.createObjectURL(file);

    videoRef.current.src = url;
    videoRef.current.load();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const tenths = Math.floor((time % 1) * 10);

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  };

  return (
    <div className="app">
      <header className="header">
        <h1>CueDirector</h1>

        <div className="timer">
          {formatTime(currentTime)}
        </div>
      </header>

      <main className="content">
        <section className="video-panel">
          <video
            ref={videoRef}
            controls
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              backgroundColor: "#000",
            }}
          />
        </section>

        <aside className="cue-panel">
          <h2>No cues loaded</h2>
        </aside>
      </main>

      <footer className="footer">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={handleLoadVideo}
        />

        <button onClick={() => fileInputRef.current?.click()}>
          Load Video
        </button>

        <button>Load Cue Sheet</button>
      </footer>
    </div>
  );
}

export default App;