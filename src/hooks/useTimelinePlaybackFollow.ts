import { type RefObject, useCallback, useRef } from "react";

const FOLLOW_MARGIN_RATIO = 0.18;
const FOLLOW_LERP = 0.22;

export function useTimelinePlaybackFollow(
  scrollRef: RefObject<HTMLDivElement | null>,
  trackRef: RefObject<HTMLDivElement | null>,
) {
  const isFollowingRef = useRef(true);

  const pauseFollow = useCallback(() => {
    isFollowingRef.current = false;
  }, []);

  const resumeFollow = useCallback(() => {
    isFollowingRef.current = true;
  }, []);

  const followTime = useCallback(
    (time: number, duration: number, zoom: number) => {
      if (!isFollowingRef.current || zoom <= 1 || duration <= 0) return;

      const viewport = scrollRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;

      const trackWidth = track.offsetWidth;
      const viewportWidth = viewport.clientWidth;
      if (trackWidth <= viewportWidth) return;

      const playheadX = (time / duration) * trackWidth;
      const margin = viewportWidth * FOLLOW_MARGIN_RATIO;
      const scrollLeft = viewport.scrollLeft;
      let targetScroll = scrollLeft;

      if (playheadX < scrollLeft + margin) {
        targetScroll = playheadX - margin;
      } else if (playheadX > scrollLeft + viewportWidth - margin) {
        targetScroll = playheadX - viewportWidth + margin;
      } else {
        return;
      }

      const maxScroll = trackWidth - viewportWidth;
      targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));
      viewport.scrollLeft += (targetScroll - scrollLeft) * FOLLOW_LERP;
    },
    [scrollRef, trackRef],
  );

  const scrollToTime = useCallback(
    (time: number, duration: number, zoom: number, smooth = true) => {
      if (zoom <= 1 || duration <= 0) return;

      const viewport = scrollRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;

      const trackWidth = track.offsetWidth;
      const viewportWidth = viewport.clientWidth;
      if (trackWidth <= viewportWidth) return;

      const playheadX = (time / duration) * trackWidth;
      const targetScroll = Math.max(
        0,
        Math.min(playheadX - viewportWidth * 0.5, trackWidth - viewportWidth),
      );

      if (smooth) {
        viewport.scrollTo({ left: targetScroll, behavior: "smooth" });
      } else {
        viewport.scrollLeft = targetScroll;
      }
    },
    [scrollRef, trackRef],
  );

  return {
    followTime,
    scrollToTime,
    pauseFollow,
    resumeFollow,
  };
}
