import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export interface VideoPlayerHandle {
  togglePlayPause: () => void;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
  pause: () => void;
}

interface VideoPlayerProps {
  src?: string;
  onTimeUpdate: (time: number) => void;
  onEnded?: () => void;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, onTimeUpdate, onEnded }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLElement>(null);

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
        getCurrentTime() {
          return videoRef.current?.currentTime ?? 0;
        },
        getDuration() {
          const videoDuration = videoRef.current?.duration ?? 0;
          return Number.isFinite(videoDuration) ? videoDuration : 0;
        },
        seekTo(time: number) {
          const video = videoRef.current;
          if (!video || !src) return;

          video.currentTime = time;
          onTimeUpdate(time);
        },
        pause() {
          videoRef.current?.pause();
        },
      }),
      [src, onTimeUpdate],
    );

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

      video.load();
      video.currentTime = 0;
    }, [src]);

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
            onEnded={() => onEnded?.()}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              backgroundColor: "#000",
            }}
          />

          <div className="video-controls-reserved" aria-hidden="true" />
        </div>
      </section>
    );
  },
);

export default VideoPlayer;
