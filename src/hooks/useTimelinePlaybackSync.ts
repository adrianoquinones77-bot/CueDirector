import { type RefObject, useEffect, useRef, useState } from "react";
import type { VideoPlayerHandle } from "../components/VideoPlayer";

interface UseTimelinePlaybackSyncOptions {
  /** From video onTimeUpdate → useShowDirector → App (authoritative on web). */
  currentTime: number;
  videoDuration: number;
  videoSrc?: string;
  videoPlayerRef: RefObject<VideoPlayerHandle | null>;
  isDragging: boolean;
  /** Used only while scrubbing the playhead. */
  scrubTime: number;
  zoomRef: RefObject<number>;
  followTime: (time: number, duration: number, zoom: number) => void;
  isDraggingRef: RefObject<boolean>;
}

/**
 * Playback tracking shared by Electron and web.
 *
 * Electron: RAF reads getCurrentTime()/getDuration() reliably (file:// URLs).
 * Web: onTimeUpdate → currentTime prop is authoritative; RAF only scroll-follows.
 *
 * Playhead position always derives from currentTime (same as Electron's effective chain).
 */
export function useTimelinePlaybackSync({
  currentTime,
  videoDuration,
  videoSrc,
  videoPlayerRef,
  isDragging,
  scrubTime,
  zoomRef,
  followTime,
  isDraggingRef,
}: UseTimelinePlaybackSyncOptions) {
  const [duration, setDuration] = useState(0);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const videoDurationRef = useRef(videoDuration);
  videoDurationRef.current = videoDuration;

  useEffect(() => {
    setDuration(0);
  }, [videoSrc]);

  useEffect(() => {
    if (videoDuration > 0) {
      setDuration(videoDuration);
    }
  }, [videoDuration]);

  // Electron-style RAF: poll video ref for duration + auto-scroll while zoomed.
  // Does not drive playhead position — that comes from the currentTime prop.
  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      if (!isDraggingRef.current) {
        const player = videoPlayerRef.current;
        const propTime = currentTimeRef.current;

        if (player) {
          const playerDuration = player.getDuration();
          if (playerDuration > 0) {
            setDuration((previous) =>
              previous === playerDuration ? previous : playerDuration,
            );
            const playerTime = player.getCurrentTime();
            followTime(
              playerTime > 0 ? playerTime : propTime,
              playerDuration,
              zoomRef.current,
            );
          } else if (videoDurationRef.current > 0) {
            setDuration((previous) =>
              previous === videoDurationRef.current
                ? previous
                : videoDurationRef.current,
            );
          }
        } else if (videoDurationRef.current > 0) {
          setDuration((previous) =>
            previous === videoDurationRef.current
              ? previous
              : videoDurationRef.current,
          );
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [followTime, videoPlayerRef, zoomRef, isDraggingRef]);

  const playerDuration = videoPlayerRef.current?.getDuration() ?? 0;
  const effectiveDuration =
    duration > 0
      ? duration
      : videoDuration > 0
        ? videoDuration
        : Number.isFinite(playerDuration) && playerDuration > 0
          ? playerDuration
          : 0;

  const hasDuration = effectiveDuration > 0;
  const playheadTime = isDragging ? scrubTime : currentTime;
  const playheadPosition = hasDuration
    ? (playheadTime / effectiveDuration) * 100
    : 0;

  return {
    duration: effectiveDuration,
    hasDuration,
    playheadPosition,
    playheadTime,
  };
}
