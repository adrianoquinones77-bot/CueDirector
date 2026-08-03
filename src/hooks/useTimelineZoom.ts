import {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";

export const TIMELINE_ZOOM_MIN = 1;
export const TIMELINE_ZOOM_MAX = 10;
export const TIMELINE_ZOOM_STEP = 0.5;

function clampZoom(value: number): number {
  return Math.max(TIMELINE_ZOOM_MIN, Math.min(TIMELINE_ZOOM_MAX, value));
}

interface PendingScrollAnchor {
  timeRatio: number;
  anchorInViewport: number;
}

/**
 * Controlled timeline scale — zoom only changes horizontal track width
 * (pixels per second). Does not affect playback time or playhead position.
 */
export function useTimelineZoom(
  scrollElement: HTMLDivElement | null,
  trackRef: RefObject<HTMLDivElement | null>,
  zoom: number,
  onZoomChange?: (zoom: number) => void,
) {
  const clampedZoom = clampZoom(zoom);
  const zoomRef = useRef(clampedZoom);
  zoomRef.current = clampedZoom;

  const pendingAnchorRef = useRef<PendingScrollAnchor | null>(null);
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  useLayoutEffect(() => {
    const pending = pendingAnchorRef.current;
    const viewport = scrollElement;
    const track = trackRef.current;
    if (!pending || !viewport || !track) return;

    pendingAnchorRef.current = null;
    const trackWidth = track.offsetWidth;
    const anchorOnTrack = pending.timeRatio * trackWidth;
    viewport.scrollLeft = Math.max(
      0,
      Math.min(
        anchorOnTrack - pending.anchorInViewport,
        trackWidth - viewport.clientWidth,
      ),
    );
  }, [clampedZoom, scrollElement, trackRef]);

  const applyScaleZoom = useCallback(
    (nextZoom: number, anchorClientX?: number) => {
      const clamped = clampZoom(nextZoom);
      if (clamped === zoomRef.current) return;

      const viewport = scrollElement;
      const track = trackRef.current;

      if (
        viewport &&
        track &&
        track.offsetWidth > 0 &&
        anchorClientX !== undefined
      ) {
        const rect = viewport.getBoundingClientRect();
        const anchorInViewport = anchorClientX - rect.left;
        const anchorOnTrack = viewport.scrollLeft + anchorInViewport;
        const timeRatio = anchorOnTrack / track.offsetWidth;
        pendingAnchorRef.current = { timeRatio, anchorInViewport };
      }

      onZoomChangeRef.current?.(clamped);
    },
    [scrollElement, trackRef],
  );

  const getZoomAnchorClientX = useCallback(() => {
    const viewport = scrollElement;
    if (!viewport) return undefined;
    const rect = viewport.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }, [scrollElement]);

  const zoomIn = useCallback(() => {
    applyScaleZoom(
      zoomRef.current + TIMELINE_ZOOM_STEP,
      getZoomAnchorClientX(),
    );
  }, [applyScaleZoom, getZoomAnchorClientX]);

  const zoomOut = useCallback(() => {
    applyScaleZoom(
      zoomRef.current - TIMELINE_ZOOM_STEP,
      getZoomAnchorClientX(),
    );
  }, [applyScaleZoom, getZoomAnchorClientX]);

  return {
    zoom: clampedZoom,
    zoomRef,
    zoomIn,
    zoomOut,
    canZoomIn: clampedZoom < TIMELINE_ZOOM_MAX,
    canZoomOut: clampedZoom > TIMELINE_ZOOM_MIN,
  };
}
