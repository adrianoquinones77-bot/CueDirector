import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { VideoPlayerHandle } from "../components/VideoPlayer";
import { useTimelinePlaybackFollow } from "./useTimelinePlaybackFollow";
import { useTimelinePlaybackSync } from "./useTimelinePlaybackSync";
import { useTimelineZoom } from "./useTimelineZoom";

const USER_SCROLL_PAUSE_MS = 2000;

export interface UseTimelineInteractionOptions {
  currentTime: number;
  videoPlayerRef: RefObject<VideoPlayerHandle | null>;
  videoSrc?: string;
  videoDuration?: number;
  zoomEnabled: boolean;
  timelineZoom?: number;
  onTimelineZoomChange?: (zoom: number) => void;
  /** When true, user scroll should not resume auto-follow (e.g. cue marker drag). */
  shouldBlockAutoFollow?: () => boolean;
}

export function useTimelineInteraction({
  currentTime,
  videoPlayerRef,
  videoSrc,
  videoDuration = 0,
  zoomEnabled,
  timelineZoom = 1,
  onTimelineZoomChange,
  shouldBlockAutoFollow,
}: UseTimelineInteractionOptions) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  const [scrubTime, setScrubTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const scrubTimeRef = useRef(scrubTime);
  scrubTimeRef.current = scrubTime;
  const shouldBlockAutoFollowRef = useRef(shouldBlockAutoFollow);
  shouldBlockAutoFollowRef.current = shouldBlockAutoFollow;

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setScrollElement(node);
  }, []);

  const { zoom, zoomRef, zoomIn, zoomOut, canZoomIn, canZoomOut } = useTimelineZoom(
    scrollElement,
    trackRef,
    timelineZoom,
    onTimelineZoomChange,
  );

  const { followTime, pauseFollow, resumeFollow } = useTimelinePlaybackFollow(
    scrollRef,
    trackRef,
  );

  const { duration, hasDuration, playheadPosition, playheadTime } =
    useTimelinePlaybackSync({
      currentTime,
      videoDuration,
      videoSrc,
      videoPlayerRef,
      isDragging,
      scrubTime,
      zoomRef,
      followTime,
      isDraggingRef,
    });

  // User manual scroll pauses playback auto-follow.
  useEffect(() => {
    const viewport = scrollElement;
    if (!viewport || !zoomEnabled) return;

    let resumeTimeout = 0;

    const handleScroll = () => {
      if (isDraggingRef.current || shouldBlockAutoFollowRef.current?.()) return;

      pauseFollow();
      window.clearTimeout(resumeTimeout);
      resumeTimeout = window.setTimeout(() => {
        resumeFollow();
      }, USER_SCROLL_PAUSE_MS);
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      window.clearTimeout(resumeTimeout);
    };
  }, [pauseFollow, resumeFollow, scrollElement, zoomEnabled]);

  const beginPlayheadDrag = useCallback(() => {
    pauseFollow();
    isDraggingRef.current = true;
    setIsDragging(true);
    setScrubTime(currentTime);
  }, [currentTime, pauseFollow]);

  const updatePlayheadDrag = useCallback(
    (time: number) => {
      setScrubTime(time);
      videoPlayerRef.current?.scrubTo(time);
    },
    [videoPlayerRef],
  );

  const finishPlayheadDrag = useCallback(
    (time: number) => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      setIsDragging(false);
      resumeFollow();
      videoPlayerRef.current?.seekTo(time);
    },
    [resumeFollow, videoPlayerRef],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowPointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      resumeFollow();
      videoPlayerRef.current?.seekTo(scrubTimeRef.current);
    };

    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [isDragging, resumeFollow, videoPlayerRef]);

  return {
    trackRef,
    scrollRef: setScrollRef,
    zoom,
    zoomEnabled,
    zoomIn,
    zoomOut,
    canZoomIn,
    canZoomOut,
    displayTime: playheadTime,
    duration,
    hasDuration,
    playheadPosition,
    isDragging,
    isDraggingRef,
    beginPlayheadDrag,
    updatePlayheadDrag,
    finishPlayheadDrag,
    pauseFollow,
    resumeFollow,
  };
}
