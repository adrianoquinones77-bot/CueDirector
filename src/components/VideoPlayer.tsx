import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  SEEK_COOLDOWN_MS,
  applyVideoSeek,
  clampVideoTime,
  isVideoSeekReady,
} from "../utils/safeVideoSeek";

export interface VideoPlayerHandle {
  togglePlayPause: () => void;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
  scrubTo: (time: number) => void;
  pause: () => void;
}

interface VideoPlayerProps {
  src?: string;
  onTimeUpdate: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
}

interface PendingSeek {
  time: number;
  resumePlayback: boolean;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, onTimeUpdate, onDurationChange, onEnded }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLElement>(null);
    const seekInProgressRef = useRef(false);
    const lastSeekAtRef = useRef(0);
    const pendingSeekRef = useRef<PendingSeek | null>(null);
    const seekClearTimeoutRef = useRef<number | null>(null);
    const srcRef = useRef(src);
    srcRef.current = src;
    const onDurationChangeRef = useRef(onDurationChange);
    onDurationChangeRef.current = onDurationChange;

    const notifyDuration = useCallback((video: HTMLVideoElement) => {
      const nextDuration = video.duration;
      if (Number.isFinite(nextDuration) && nextDuration > 0) {
        onDurationChangeRef.current?.(nextDuration);
      }
    }, []);

    const releaseSeekLock = useCallback(() => {
      seekInProgressRef.current = false;

      if (seekClearTimeoutRef.current !== null) {
        window.clearTimeout(seekClearTimeoutRef.current);
        seekClearTimeoutRef.current = null;
      }
    }, []);

    const queuePendingSeek = useCallback(
      (time: number, resumePlayback: boolean) => {
        const existing = pendingSeekRef.current;
        pendingSeekRef.current = {
          time,
          resumePlayback: resumePlayback || (existing?.resumePlayback ?? false),
        };
      },
      [],
    );

    const performSeek = useCallback(
      (video: HTMLVideoElement, time: number, resumePlayback?: boolean) => {
        if (!srcRef.current) return;

        const shouldResume = resumePlayback ?? !video.paused;

        if (seekInProgressRef.current) {
          queuePendingSeek(time, shouldResume);
          return;
        }

        const now = Date.now();
        if (now - lastSeekAtRef.current < SEEK_COOLDOWN_MS) {
          queuePendingSeek(time, shouldResume);
          return;
        }

        if (!isVideoSeekReady(video)) {
          return;
        }

        const applied = applyVideoSeek(video, time);
        if (applied === null) {
          return;
        }

        seekInProgressRef.current = true;
        lastSeekAtRef.current = now;
        onTimeUpdate(applied);

        const finalizeSeek = () => {
          releaseSeekLock();

          if (shouldResume) {
            void video.play().catch(() => {});
          }

          const pending = pendingSeekRef.current;
          pendingSeekRef.current = null;

          if (pending && videoRef.current) {
            performSeek(
              videoRef.current,
              pending.time,
              pending.resumePlayback,
            );
          }
        };

        video.addEventListener("seeked", finalizeSeek, { once: true });
        seekClearTimeoutRef.current = window.setTimeout(finalizeSeek, 300);
      },
      [onTimeUpdate, queuePendingSeek, releaseSeekLock],
    );

    useImperativeHandle(
      ref,
      () => ({
        togglePlayPause() {
          const video = videoRef.current;
          if (!video || !srcRef.current) return;

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
          const video = videoRef.current;
          if (!video) return 0;
          return clampVideoTime(video, video.currentTime);
        },
        getDuration() {
          const videoDuration = videoRef.current?.duration ?? 0;
          return Number.isFinite(videoDuration) ? videoDuration : 0;
        },
        seekTo(time: number) {
          const video = videoRef.current;
          if (!video || !srcRef.current) return;
          performSeek(video, time);
        },
        scrubTo(time: number) {
          const video = videoRef.current;
          if (!video || !srcRef.current) return;

          const applied = applyVideoSeek(video, time);
          if (applied !== null) {
            onTimeUpdate(applied);
          }
        },
        pause() {
          videoRef.current?.pause();
        },
      }),
      [performSeek, onTimeUpdate],
    );

    useEffect(() => {
      const video = videoRef.current;
      if (!video || !src) return;

      console.log("[CueDirector media] VideoPlayer assigning src", { src });

      let cancelled = false;
      releaseSeekLock();
      pendingSeekRef.current = null;
      video.load();

      const resetToStart = () => {
        if (cancelled) return;

        notifyDuration(video);

        const applied = applyVideoSeek(video, 0);
        if (applied !== null) {
          onTimeUpdate(applied);
        }
      };

      if (isVideoSeekReady(video)) {
        resetToStart();
      } else {
        video.addEventListener("loadedmetadata", resetToStart, { once: true });
      }

      const handleDurationChange = () => notifyDuration(video);
      video.addEventListener("durationchange", handleDurationChange);

      return () => {
        cancelled = true;
        video.removeEventListener("loadedmetadata", resetToStart);
        video.removeEventListener("durationchange", handleDurationChange);
        releaseSeekLock();
        pendingSeekRef.current = null;
      };
    }, [src, onTimeUpdate, notifyDuration, releaseSeekLock]);

    return (
      <section className="video-panel" ref={containerRef}>
        <div className="video-wrapper">
          <video
            ref={videoRef}
            src={src}
            controls
            onTimeUpdate={() => {
              if (videoRef.current) {
                onTimeUpdate(
                  clampVideoTime(
                    videoRef.current,
                    videoRef.current.currentTime,
                  ),
                );
              }
            }}
            onEnded={() => onEnded?.()}
            onError={() => {
              console.error("[CueDirector media] VideoPlayer load error", {
                src,
                networkState: videoRef.current?.networkState,
                readyState: videoRef.current?.readyState,
                error: videoRef.current?.error?.code,
              });
            }}
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
