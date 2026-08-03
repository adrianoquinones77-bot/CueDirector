import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from "react";
import { useTimelineInteraction } from "../hooks/useTimelineInteraction";
import { blockArrowKeyFocusNavigation } from "../hooks/useVideoSeekShortcuts";
import type { VideoPlayerHandle } from "./VideoPlayer";
import type { Cue } from "../types/cue";
import { getCueEndTime, isCueActive } from "../utils/cueTiming";
import { getCueDisplayIcon } from "../utils/cueEmoji";
import { formatTime, formatTimelineClock, snapCueTime } from "../utils/formatTime";
import { getCueWindow } from "../utils/getCueWindow";

interface CueTimelineProps {
  cues: Cue[];
  currentTime: number;
  defaultCueDuration: number;
  videoPlayerRef: RefObject<VideoPlayerHandle | null>;
  directorMode?: boolean;
  editorMode?: boolean;
  selectedCueIndex?: number | null;
  onSelectCue?: (index: number) => void;
  onCueContextMenu?: (index: number, event: React.MouseEvent) => void;
  onUpdateCueTime?: (index: number, time: number) => void;
  videoSrc?: string;
  videoDuration?: number;
  timelineZoom?: number;
  onTimelineZoomChange?: (zoom: number) => void;
}

type MarkerVariant = "past" | "current" | "next" | "future";

interface MarkerDragState {
  index: number;
  startX: number;
  hasMoved: boolean;
}

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
 * Interaction (zoom, playhead sync, scroll follow) is handled by useTimelineInteraction
 * so Electron and web share identical behavior.
 */
export default function CueTimeline({
  cues,
  currentTime,
  defaultCueDuration,
  videoPlayerRef,
  directorMode = false,
  editorMode = false,
  selectedCueIndex = null,
  onSelectCue,
  onCueContextMenu,
  onUpdateCueTime,
  videoSrc,
  videoDuration = 0,
  timelineZoom = 1,
  onTimelineZoomChange,
}: CueTimelineProps) {
  const markerDragRef = useRef<MarkerDragState | null>(null);
  const [markerDragPreview, setMarkerDragPreview] = useState<{
    index: number;
    time: number;
  } | null>(null);

  const shouldBlockAutoFollow = useCallback(
    () => markerDragRef.current !== null,
    [],
  );

  const zoomEnabled = directorMode || editorMode;
  const isViewOnly = directorMode;
  const canEditCues = editorMode && Boolean(onUpdateCueTime);
  const canSeek = !directorMode;

  const {
    trackRef,
    scrollRef,
    zoom,
    zoomIn,
    zoomOut,
    canZoomIn,
    canZoomOut,
    displayTime,
    duration,
    hasDuration,
    isDragging,
    isDraggingRef,
    beginPlayheadDrag,
    updatePlayheadDrag,
    finishPlayheadDrag,
    pauseFollow,
    resumeFollow,
  } = useTimelineInteraction({
    currentTime,
    videoPlayerRef,
    videoSrc,
    videoDuration,
    zoomEnabled,
    timelineZoom,
    onTimelineZoomChange,
    shouldBlockAutoFollow,
  });

  const isMarkerDragging = markerDragPreview !== null;

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || duration <= 0) return 0;

      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return snapCueTime(ratio * duration, duration);
    },
    [duration, trackRef],
  );

  const autoScrollViewport = useCallback(
    (clientX: number) => {
      if (zoom <= 1) return;

      const viewport = trackRef.current?.parentElement;
      if (!viewport) return;

      const rect = viewport.getBoundingClientRect();
      const edge = 56;
      const step = 16;

      if (clientX < rect.left + edge) {
        viewport.scrollLeft = Math.max(0, viewport.scrollLeft - step);
      } else if (clientX > rect.right - edge) {
        viewport.scrollLeft = Math.min(
          viewport.scrollWidth - viewport.clientWidth,
          viewport.scrollLeft + step,
        );
      }
    },
    [zoom, trackRef],
  );

  const handleTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canSeek || markerDragRef.current) return;

      if (
        (event.target as HTMLElement).closest(
          ".cue-timeline__marker, .cue-timeline__playhead",
        )
      ) {
        return;
      }

      videoPlayerRef.current?.seekTo(getTimeFromClientX(event.clientX));
    },
    [canSeek, getTimeFromClientX, videoPlayerRef],
  );

  const handlePlayheadPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canSeek || markerDragRef.current) return;

      event.stopPropagation();
      beginPlayheadDrag();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [beginPlayheadDrag, canSeek],
  );

  const handlePlayheadPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;

      autoScrollViewport(event.clientX);
      updatePlayheadDrag(getTimeFromClientX(event.clientX));
    },
    [autoScrollViewport, getTimeFromClientX, isDraggingRef, updatePlayheadDrag],
  );

  const handleFinishPlayheadDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      finishPlayheadDrag(getTimeFromClientX(event.clientX));
    },
    [finishPlayheadDrag, getTimeFromClientX],
  );

  const finishMarkerDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, cueTime: number) => {
      const drag = markerDragRef.current;
      markerDragRef.current = null;
      setMarkerDragPreview(null);
      resumeFollow();

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (!drag) return;

      if (drag.hasMoved && onUpdateCueTime) {
        onUpdateCueTime(drag.index, getTimeFromClientX(event.clientX));
        return;
      }

      if (canSeek && event.button === 0) {
        videoPlayerRef.current?.seekTo(cueTime);
      }
    },
    [canSeek, getTimeFromClientX, onUpdateCueTime, resumeFollow, videoPlayerRef],
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

      if (!canEditCues) {
        if (canSeek && event.button === 0) {
          videoPlayerRef.current?.seekTo(cueTime);
        }
        return;
      }

      pauseFollow();
      markerDragRef.current = {
        index: cueIndex,
        startX: event.clientX,
        hasMoved: false,
      };
      setMarkerDragPreview({ index: cueIndex, time: cueTime });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canEditCues, canSeek, editorMode, onSelectCue, pauseFollow, videoPlayerRef],
  );

  const handleCueMarkerPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = markerDragRef.current;
      if (!drag || !canEditCues) return;

      if (Math.abs(event.clientX - drag.startX) > 3) {
        drag.hasMoved = true;
      }

      if (!drag.hasMoved) return;

      autoScrollViewport(event.clientX);
      const time = getTimeFromClientX(event.clientX);
      setMarkerDragPreview({ index: drag.index, time });
    },
    [autoScrollViewport, canEditCues, getTimeFromClientX],
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

  const { next } = getCueWindow(cues, currentTime, defaultCueDuration);

  const timelineClassName = [
    "cue-timeline",
    editorMode ? "cue-timeline--editor" : "",
    directorMode ? "cue-timeline--director" : "",
    hasDuration ? "" : "cue-timeline--empty",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={timelineClassName}>
      <div className="cue-timeline__header">
        <span className="cue-timeline__time">
          {formatTimelineClock(isDragging ? displayTime : currentTime)}
        </span>
        <span className="cue-timeline__time cue-timeline__time--total">
          {hasDuration ? formatTimelineClock(duration) : "--:--"}
        </span>
      </div>

      <div className="cue-timeline__zoom-bar">
        <button
          type="button"
          className="cue-timeline__zoom-btn"
          onClick={zoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out timeline"
        >
          −
        </button>
        <span className="cue-timeline__zoom-label">
          Timeline Zoom{" "}
          <span className="cue-timeline__zoom-level" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
        </span>
        <button
          type="button"
          className="cue-timeline__zoom-btn"
          onClick={zoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in timeline"
        >
          +
        </button>
      </div>

      <div
        ref={scrollRef}
        className={`cue-timeline__scroll${zoom > 1 ? " cue-timeline__scroll--zoomable" : ""}`}
      >
        <div
          ref={trackRef}
          className={`cue-timeline__track${isDragging ? " cue-timeline__track--dragging" : ""}${isMarkerDragging ? " cue-timeline__track--marker-dragging" : ""}${isViewOnly ? " cue-timeline__track--view-only" : ""}${hasDuration ? "" : " cue-timeline__track--empty"}`}
          style={{ width: `${zoom * 100}%`, minWidth: "100%" }}
          onPointerDown={hasDuration && canSeek ? handleTrackPointerDown : undefined}
        >
          <div className="cue-timeline__rail" aria-hidden="true" />

          {hasDuration && (
            <>
              <div
                className={`cue-timeline__playhead${isDragging ? " cue-timeline__playhead--dragging" : ""}`}
                style={{
                  left: `${
                    hasDuration
                      ? ((isDragging ? displayTime : currentTime) / duration) * 100
                      : 0
                  }%`,
                }}
                onPointerDown={canSeek ? handlePlayheadPointerDown : undefined}
                onPointerMove={handlePlayheadPointerMove}
                onPointerUp={handleFinishPlayheadDrag}
                onPointerCancel={handleFinishPlayheadDrag}
              >
                <span className="cue-timeline__playhead-handle" aria-hidden="true" />
              </div>

              {cues.map((cue, index) => {
                const cueEmoji = getCueDisplayIcon(cue);
                const isSelected = editorMode && selectedCueIndex === index;
                const isDraggingMarker = markerDragPreview?.index === index;
                const displayCueTime =
                  isDraggingMarker && markerDragPreview
                    ? markerDragPreview.time
                    : cue.time;

                return (
                  <button
                    key={`${cue.time}-${index}`}
                    type="button"
                    className={`cue-timeline__marker cue-timeline__marker--${getMarkerVariant(cue, next, currentTime, defaultCueDuration)}${isSelected ? " cue-timeline__marker--selected" : ""}${isDraggingMarker ? " cue-timeline__marker--dragging" : ""}`}
                    style={{ left: `${(displayCueTime / duration) * 100}%` }}
                    onPointerDown={(event) =>
                      handleCueMarkerPointerDown(event, cue.time, index)
                    }
                    onPointerMove={handleCueMarkerPointerMove}
                    onPointerUp={(event) => finishMarkerDrag(event, cue.time)}
                    onPointerCancel={(event) => finishMarkerDrag(event, cue.time)}
                    onContextMenu={(event) => handleCueMarkerContextMenu(event, index)}
                    onKeyDown={blockArrowKeyFocusNavigation}
                    aria-label={
                      canEditCues
                        ? `Cue ${cue.text} at ${formatTime(displayCueTime)}. Drag horizontally to edit time.`
                        : `Cue ${cue.text} at ${formatTime(cue.time)}`
                    }
                    aria-pressed={isSelected || undefined}
                  >
                    <span className="cue-timeline__marker-icon" aria-hidden="true">
                      {cueEmoji}
                    </span>
                    <span className="cue-timeline__tooltip">
                      <span className="cue-timeline__tooltip-emoji">{cueEmoji}</span>
                      <span className="cue-timeline__tooltip-name">{cue.text}</span>
                      <span className="cue-timeline__tooltip-time">
                        {formatTime(displayCueTime)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
