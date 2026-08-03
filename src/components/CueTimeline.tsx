import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { VideoPlayerHandle } from "./VideoPlayer";
import type { Cue } from "../types/cue";
import { getCueEndTime, isCueActive } from "../utils/cueTiming";
import { formatTime } from "../utils/formatTime";
import { getCueWindow } from "../utils/getCueWindow";

interface CueTimelineProps {
  cues: Cue[];
  currentTime: number;
  defaultCueDuration: number;
  videoPlayerRef: RefObject<VideoPlayerHandle | null>;
}

type MarkerVariant = "past" | "current" | "next" | "future";

function getMarkerVariant(
  cue: Cue,
  next: Cue | undefined,
  currentTime: number,
  defaultCueDuration: number,
): MarkerVariant {
  if (isCueActive(cue, currentTime, defaultCueDuration)) return "current";
  if (next && cue.time === next.time) return "next";
  if (currentTime >= getCueEndTime(cue, defaultCueDuration)) return "past";
  return "future";
}

export default function CueTimeline({
  cues,
  currentTime,
  defaultCueDuration,
  videoPlayerRef,
}: CueTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [smoothTime, setSmoothTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isDragging) {
      setSmoothTime(currentTime);
    }
  }, [currentTime, isDragging]);

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      const player = videoPlayerRef.current;
      if (player) {
        if (!isDraggingRef.current) {
          setSmoothTime(player.getCurrentTime());
        }
        const videoDuration = player.getDuration();
        if (videoDuration > 0) {
          setDuration(videoDuration);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [videoPlayerRef]);

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || duration <= 0) return 0;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration],
  );

  const handleTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        (event.target as HTMLElement).closest(
          ".cue-timeline__marker, .cue-timeline__playhead",
        )
      ) {
        return;
      }

      const time = getTimeFromClientX(event.clientX);
      videoPlayerRef.current?.seekTo(time);
    },
    [getTimeFromClientX, videoPlayerRef],
  );

  const handlePlayheadPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      isDraggingRef.current = true;
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const handlePlayheadPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;

      const time = getTimeFromClientX(event.clientX);
      setSmoothTime(time);
      videoPlayerRef.current?.scrubTo(time);
    },
    [getTimeFromClientX, videoPlayerRef],
  );

  const finishPlayheadDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setIsDragging(false);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const time = getTimeFromClientX(event.clientX);
      videoPlayerRef.current?.seekTo(time);
    },
    [getTimeFromClientX, videoPlayerRef],
  );

  const handleCueMarkerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, cueTime: number) => {
      event.stopPropagation();
      videoPlayerRef.current?.seekTo(cueTime);
    },
    [videoPlayerRef],
  );

  if (duration <= 0) return null;

  const { next } = getCueWindow(cues, currentTime, defaultCueDuration);
  const playheadPosition = (smoothTime / duration) * 100;

  return (
    <div className="cue-timeline">
      <div className="cue-timeline__header">
        <span className="cue-timeline__time">{formatTime(smoothTime)}</span>
        <span className="cue-timeline__time cue-timeline__time--total">
          {formatTime(duration)}
        </span>
      </div>

      <div
        ref={trackRef}
        className={`cue-timeline__track${isDragging ? " cue-timeline__track--dragging" : ""}`}
        onPointerDown={handleTrackPointerDown}
      >
        <div
          className={`cue-timeline__playhead${isDragging ? " cue-timeline__playhead--dragging" : ""}`}
          style={{ left: `${playheadPosition}%` }}
          onPointerDown={handlePlayheadPointerDown}
          onPointerMove={handlePlayheadPointerMove}
          onPointerUp={finishPlayheadDrag}
          onPointerCancel={finishPlayheadDrag}
        >
          <span className="cue-timeline__playhead-handle" aria-hidden="true" />
        </div>

        {cues.map((cue, index) => (
          <button
            key={`${cue.time}-${index}`}
            type="button"
            className={`cue-timeline__marker cue-timeline__marker--${getMarkerVariant(cue, next, currentTime, defaultCueDuration)}`}
            style={{ left: `${(cue.time / duration) * 100}%` }}
            onPointerDown={(event) => handleCueMarkerPointerDown(event, cue.time)}
            aria-label={`Seek to cue ${cue.text} at ${formatTime(cue.time)}`}
          >
            <span className="cue-timeline__tooltip">
              <span className="cue-timeline__tooltip-name">{cue.text}</span>
              <span className="cue-timeline__tooltip-time">
                {formatTime(cue.time)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
