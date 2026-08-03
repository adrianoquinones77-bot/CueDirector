import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { blockArrowKeyFocusNavigation } from "../hooks/useVideoSeekShortcuts";
import type { VideoPlayerHandle } from "./VideoPlayer";
import type { Cue } from "../types/cue";
import { getCueEndTime, isCueActive } from "../utils/cueTiming";
import { getCueDisplayIcon } from "../utils/cueEmoji";
import { formatTime, formatTimelineClock } from "../utils/formatTime";
import { getCueWindow } from "../utils/getCueWindow";

interface CueTimelineProps {
  cues: Cue[];
  currentTime: number;
  defaultCueDuration: number;
  videoPlayerRef: RefObject<VideoPlayerHandle | null>;
  editorMode?: boolean;
  selectedCueIndex?: number | null;
  onSelectCue?: (index: number) => void;
  onCueContextMenu?: (index: number, event: React.MouseEvent) => void;
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

/**
 * Interactive timeline below the video player.
 *
 * Navigation uses the VideoPlayer ref directly — no video remount, no URL changes.
 * - Track click: seek via seekTo() (safe seek with lock/cooldown)
 * - Playhead drag: scrub via scrubTo() for real-time preview while dragging
 * - Cue marker click: jump to that cue's timestamp
 *
 * currentTime prop drives NOW/NEXT in CuePanel whenever scrubTo/seekTo fires onTimeUpdate.
 */
export default function CueTimeline({
  cues,
  currentTime,
  defaultCueDuration,
  videoPlayerRef,
  editorMode = false,
  selectedCueIndex = null,
  onSelectCue,
  onCueContextMenu,
}: CueTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [smoothTime, setSmoothTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  // Sync playhead to app currentTime unless the user is actively dragging.
  useEffect(() => {
    if (!isDragging) {
      setSmoothTime(currentTime);
    }
  }, [currentTime, isDragging]);

  // Poll the video element for smooth playhead motion during playback.
  // Reads duration from the mounted video — no separate video state here.
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
      // Ignore clicks that land on the playhead or a cue marker.
      if (
        (event.target as HTMLElement).closest(
          ".cue-timeline__marker, .cue-timeline__playhead",
        )
      ) {
        return;
      }

      videoPlayerRef.current?.seekTo(getTimeFromClientX(event.clientX));
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
      // scrubTo updates video.currentTime immediately without seek lock.
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

      // Finalize with a proper seek so playback state stays consistent.
      videoPlayerRef.current?.seekTo(getTimeFromClientX(event.clientX));
    },
    [getTimeFromClientX, videoPlayerRef],
  );

  const handleCueMarkerPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      cueTime: number,
      cueIndex: number,
    ) => {
      event.stopPropagation();

      if (editorMode && onSelectCue) {
        onSelectCue(cueIndex);
      }

      if (event.button === 0) {
        videoPlayerRef.current?.seekTo(cueTime);
      }
    },
    [editorMode, onSelectCue, videoPlayerRef],
  );

  const handleCueMarkerContextMenu = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      cueIndex: number,
    ) => {
      if (!editorMode || !onCueContextMenu) return;

      event.preventDefault();
      event.stopPropagation();
      onSelectCue?.(cueIndex);
      onCueContextMenu(cueIndex, event);
    },
    [editorMode, onCueContextMenu, onSelectCue],
  );

  const hasDuration = duration > 0;
  const { next } = getCueWindow(cues, currentTime, defaultCueDuration);
  const playheadPosition = hasDuration ? (smoothTime / duration) * 100 : 0;

  return (
    <div className={`cue-timeline${editorMode ? " cue-timeline--editor" : ""}${hasDuration ? "" : " cue-timeline--empty"}`}>
      <div className="cue-timeline__header">
        <span className="cue-timeline__time">{formatTimelineClock(smoothTime)}</span>
        <span className="cue-timeline__time cue-timeline__time--total">
          {hasDuration ? formatTimelineClock(duration) : "--:--"}
        </span>
      </div>

      <div
        ref={trackRef}
        className={`cue-timeline__track${isDragging ? " cue-timeline__track--dragging" : ""}${hasDuration ? "" : " cue-timeline__track--empty"}`}
        onPointerDown={hasDuration ? handleTrackPointerDown : undefined}
      >
        <div className="cue-timeline__rail" aria-hidden="true" />

        {hasDuration && (
          <>
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

            {cues.map((cue, index) => {
              const cueEmoji = getCueDisplayIcon(cue);
              const isSelected = editorMode && selectedCueIndex === index;

              return (
              <button
                key={`${cue.time}-${index}`}
                type="button"
                className={`cue-timeline__marker cue-timeline__marker--${getMarkerVariant(cue, next, currentTime, defaultCueDuration)}${isSelected ? " cue-timeline__marker--selected" : ""}`}
                style={{ left: `${(cue.time / duration) * 100}%` }}
                onPointerDown={(event) =>
                  handleCueMarkerPointerDown(event, cue.time, index)
                }
                onContextMenu={(event) => handleCueMarkerContextMenu(event, index)}
                onKeyDown={blockArrowKeyFocusNavigation}
                aria-label={`Seek to cue ${cue.text} at ${formatTime(cue.time)}`}
                aria-pressed={isSelected || undefined}
              >
                <span className="cue-timeline__marker-icon" aria-hidden="true">
                  {cueEmoji}
                </span>
                <span className="cue-timeline__tooltip">
                  <span className="cue-timeline__tooltip-emoji">{cueEmoji}</span>
                  <span className="cue-timeline__tooltip-name">{cue.text}</span>
                  <span className="cue-timeline__tooltip-time">
                    {formatTime(cue.time)}
                  </span>
                </span>
              </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
