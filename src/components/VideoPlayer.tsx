import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Cue } from "../types/cue";

export interface VideoPlayerHandle {
  togglePlayPause: () => void;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
}

interface VideoPlayerProps {
  src?: string;
  cues: Cue[];
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, cues, currentTime, onTimeUpdate }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLElement>(null);
    const [duration, setDuration] = useState(0);

    useImperativeHandle(
      ref,
      () => ({
        togglePlayPause() {
          const video = videoRef.current;
          if (!video || !src) return;

          if (video.paused) {
            void video.play();
          } else {
            video.pause();
          }
        },
        toggleFullscreen() {
          const container = containerRef.current;
          if (!container) return;

          if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else {
            void container.requestFullscreen();
          }
        },
        exitFullscreen() {
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          }
        },
      }),
      [src],
    );

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

      video.load();
      video.currentTime = 0;
      setDuration(0);
    }, [src]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const syncDuration = () => {
        if (Number.isFinite(video.duration)) {
          setDuration(video.duration);
        }
      };

      video.addEventListener("loadedmetadata", syncDuration);
      video.addEventListener("durationchange", syncDuration);

      return () => {
        video.removeEventListener("loadedmetadata", syncDuration);
        video.removeEventListener("durationchange", syncDuration);
      };
    }, [src]);

    const nextCueTime = cues.find((cue) => cue.time > currentTime)?.time;

    return (
      <section className="video-panel" ref={containerRef}>
        <div className="video-wrapper">
          <video
            ref={videoRef}
            src={src}
            controls
            onTimeUpdate={() => {
              if (videoRef.current) {
                onTimeUpdate(videoRef.current.currentTime);
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

          {duration > 0 && cues.length > 0 && (
            <div className="cue-timeline-markers" aria-hidden="true">
              {cues.map((cue, index) => {
                const isPast = cue.time <= currentTime;
                const isNext = cue.time === nextCueTime;

                return (
                  <div
                    key={`${cue.time}-${index}`}
                    className={`cue-marker${isPast ? " cue-marker--past" : ""}${isNext ? " cue-marker--next" : ""}`}
                    style={{ left: `${(cue.time / duration) * 100}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  },
);

export default VideoPlayer;
