import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
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
  isPaused: () => boolean;
  seekTo: (time: number) => void;
  /** Queue a seek (and optional resume) for the next source load. */
  prepareSeekAfterLoad: (time: number, resumePlayback?: boolean) => void;
  /**
   * Reset playhead to the start of the current (or next) source.
   * Used when the operator manually selects a song so Play always works.
   */
  restartFromStart: (resumePlayback?: boolean) => void;
  scrubTo: (time: number) => void;
  pause: () => void;
}

function isAtMediaEnd(video: HTMLVideoElement): boolean {
  if (video.ended) return true;
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) return false;
  return video.currentTime >= duration - 0.05;
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

function logVideoRender(
  video: HTMLVideoElement,
  src: string | undefined,
  phase: string,
): void {
  console.log("[VIDEO RENDER]", {
    phase,
    src: src ?? null,
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
  });
}

const VideoPlayer = memo(
  forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, onTimeUpdate, onDurationChange, onEnded }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLElement>(null);
    const seekInProgressRef = useRef(false);
    const lastSeekAtRef = useRef(0);
    const pendingSeekRef = useRef<PendingSeek | null>(null);
    const pendingAfterLoadRef = useRef<PendingSeek | null>(null);
    const seekClearTimeoutRef = useRef<number | null>(null);
    const mediaReadyRef = useRef(false);
    const pendingPlayRef = useRef(false);
    const srcRef = useRef(src);
    srcRef.current = src;
    const onDurationChangeRef = useRef(onDurationChange);
    onDurationChangeRef.current = onDurationChange;
    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;
    const [isPlaying, setIsPlaying] = useState(false);

    // React remounts this node whenever the media path changes.
    const videoKey = src || "empty";

    useEffect(() => {
      const video = videoRef.current;
      if (!video) {
        setIsPlaying(false);
        return;
      }

      const syncPlaying = () => {
        setIsPlaying(!video.paused && !video.ended);
      };

      syncPlaying();
      video.addEventListener("play", syncPlaying);
      video.addEventListener("playing", syncPlaying);
      video.addEventListener("pause", syncPlaying);
      video.addEventListener("ended", syncPlaying);

      return () => {
        video.removeEventListener("play", syncPlaying);
        video.removeEventListener("playing", syncPlaying);
        video.removeEventListener("pause", syncPlaying);
        video.removeEventListener("ended", syncPlaying);
      };
    }, [videoKey, src]);

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
        if (!srcRef.current || !mediaReadyRef.current) {
          pendingAfterLoadRef.current = {
            time,
            resumePlayback: resumePlayback ?? !video.paused,
          };
          return;
        }

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
          pendingAfterLoadRef.current = {
            time,
            resumePlayback: shouldResume,
          };
          return;
        }

        const applied = applyVideoSeek(video, time);
        if (applied === null) {
          pendingAfterLoadRef.current = {
            time,
            resumePlayback: shouldResume,
          };
          return;
        }

        seekInProgressRef.current = true;
        lastSeekAtRef.current = now;
        onTimeUpdateRef.current(applied);

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
      [queuePendingSeek, releaseSeekLock],
    );

    useImperativeHandle(
      ref,
      () => ({
        togglePlayPause() {
          const video = videoRef.current;
          if (!video || !srcRef.current) return;

          // Treat ended / end-of-file as "paused" so Play always restarts.
          if (video.paused || video.ended) {
            if (!mediaReadyRef.current) {
              pendingPlayRef.current = true;
              const existing = pendingAfterLoadRef.current;
              pendingAfterLoadRef.current = {
                time: isAtMediaEnd(video) ? 0 : (existing?.time ?? 0),
                resumePlayback: true,
              };
              return;
            }

            if (isAtMediaEnd(video)) {
              const applied = applyVideoSeek(video, 0);
              if (applied !== null) {
                onTimeUpdateRef.current(applied);
              }
            }

            void video.play().catch(() => {});
          } else {
            pendingPlayRef.current = false;
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
        isPaused() {
          const video = videoRef.current;
          if (!video || !srcRef.current) return true;
          return video.paused || video.ended;
        },
        seekTo(time: number) {
          const video = videoRef.current;
          if (!video || !srcRef.current) {
            const existing = pendingAfterLoadRef.current;
            pendingAfterLoadRef.current = {
              time,
              resumePlayback: existing?.resumePlayback ?? false,
            };
            return;
          }
          performSeek(video, time);
        },
        prepareSeekAfterLoad(time: number, resumePlayback = false) {
          pendingAfterLoadRef.current = { time, resumePlayback };
          pendingPlayRef.current = resumePlayback;
        },
        restartFromStart(resumePlayback = false) {
          const video = videoRef.current;
          pendingPlayRef.current = resumePlayback;
          pendingAfterLoadRef.current = {
            time: 0,
            resumePlayback,
          };

          if (!video || !srcRef.current || !mediaReadyRef.current) {
            return;
          }

          const applied = applyVideoSeek(video, 0);
          if (applied !== null) {
            onTimeUpdateRef.current(applied);
          }

          if (resumePlayback) {
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        },
        scrubTo(time: number) {
          const video = videoRef.current;
          if (!video || !srcRef.current || !mediaReadyRef.current) return;

          const applied = applyVideoSeek(video, time);
          if (applied !== null) {
            onTimeUpdateRef.current(applied);
          }
        },
        pause() {
          pendingPlayRef.current = false;
          videoRef.current?.pause();
        },
      }),
      [performSeek],
    );

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      let cancelled = false;
      let ready = false;
      mediaReadyRef.current = false;
      releaseSeekLock();
      pendingSeekRef.current = null;

      const handleDurationChange = () => notifyDuration(video);
      video.addEventListener("durationchange", handleDurationChange);

      if (!src) {
        video.removeAttribute("src");
        video.load();
        logVideoRender(video, src, "cleared");
        return () => {
          cancelled = true;
          video.removeEventListener("durationchange", handleDurationChange);
        };
      }

      // Force a full resource reload on the new element.
      video.pause();
      video.src = src;
      video.load();
      logVideoRender(video, src, "load-called");

      const finishReady = (phase: string) => {
        if (cancelled || ready) return;
        ready = true;
        mediaReadyRef.current = true;
        logVideoRender(video, src, phase);

        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.warn("[VIDEO RENDER] video dimensions are zero after load", {
            src,
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
          });
        }

        notifyDuration(video);

        const pending = pendingAfterLoadRef.current;
        pendingAfterLoadRef.current = null;
        const target = pending?.time ?? 0;
        const shouldResume =
          (pending?.resumePlayback ?? false) || pendingPlayRef.current;
        pendingPlayRef.current = false;

        const applied = applyVideoSeek(video, target);
        if (applied !== null) {
          onTimeUpdateRef.current(applied);
        }

        if (shouldResume) {
          void video.play().catch(() => {});
        }
      };

      const onLoadedMetadata = () => {
        if (cancelled) return;
        logVideoRender(video, src, "loadedmetadata");
      };

      const onLoadedData = () => {
        if (cancelled) return;
        logVideoRender(video, src, "loadeddata");
        finishReady("ready");
      };

      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("loadeddata", onLoadedData);

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        finishReady("already-ready");
      }

      return () => {
        cancelled = true;
        mediaReadyRef.current = false;
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("durationchange", handleDurationChange);
        releaseSeekLock();
        pendingSeekRef.current = null;
        try {
          video.pause();
        } catch {
          // ignore
        }
      };
    }, [videoKey, src, notifyDuration, releaseSeekLock]);

    const blockSurfaceInteraction = (
      event: SyntheticEvent | ReactMouseEvent,
    ) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <section className="video-panel" ref={containerRef}>
        <div className="video-wrapper">
          <video
            key={videoKey}
            ref={videoRef}
            controls
            playsInline
            preload="auto"
            onClick={(event) => {
              // Native click-to-toggle on the picture surface is unsafe live.
              if (!videoRef.current?.paused) {
                blockSurfaceInteraction(event);
              }
            }}
            onDoubleClick={blockSurfaceInteraction}
            onTimeUpdate={() => {
              if (videoRef.current) {
                onTimeUpdateRef.current(
                  clampVideoTime(
                    videoRef.current,
                    videoRef.current.currentTime,
                  ),
                );
              }
            }}
            onEnded={() => onEnded?.()}
            onError={() => {
              const video = videoRef.current;
              console.error("[VIDEO RENDER] load error", {
                src,
                readyState: video?.readyState,
                videoWidth: video?.videoWidth,
                videoHeight: video?.videoHeight,
                error: video?.error?.code,
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

          {isPlaying ? (
            <div
              className="video-playback-shield"
              aria-hidden="true"
              title="Use Space or Play / Pause to control playback"
              onMouseDown={blockSurfaceInteraction}
              onClick={blockSurfaceInteraction}
              onDoubleClick={blockSurfaceInteraction}
              onContextMenu={blockSurfaceInteraction}
            />
          ) : null}

          <div className="video-controls-reserved" aria-hidden="true" />
        </div>
      </section>
    );
  },
  ),
);

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
