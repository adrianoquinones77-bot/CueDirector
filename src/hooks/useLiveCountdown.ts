import { useEffect, useRef, useState } from "react";

const COUNTDOWN_TICK_MS = 100;

export interface LiveCountdownSnapshot {
  /** Remaining seconds rounded to one decimal for display. */
  displayRemaining: number;
  progress: number;
  isPlaying: boolean;
}

export interface CountdownPlaybackSnapshot {
  currentTime: number;
  paused: boolean;
}

function roundToTenth(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round(seconds * 10) / 10;
}

/**
 * Countdown text + bar driven by video playback state.
 * Polls video.currentTime every 100 ms; freezes when video.paused is true.
 */
export function useLiveCountdown(
  computeProgress: (time: number) => number,
  computeRemaining: (time: number) => number,
  fallbackCurrentTime: number,
  active: boolean,
  resetKey: string,
  getPlayback: () => CountdownPlaybackSnapshot | null,
): LiveCountdownSnapshot {
  const computeProgressRef = useRef(computeProgress);
  const computeRemainingRef = useRef(computeRemaining);
  const getPlaybackRef = useRef(getPlayback);
  const fallbackTimeRef = useRef(fallbackCurrentTime);
  computeProgressRef.current = computeProgress;
  computeRemainingRef.current = computeRemaining;
  getPlaybackRef.current = getPlayback;
  fallbackTimeRef.current = fallbackCurrentTime;

  const snapshotFromTime = (
    time: number,
    playing: boolean,
  ): LiveCountdownSnapshot => {
    const remaining = computeRemainingRef.current(time);
    return {
      displayRemaining: roundToTenth(remaining),
      progress: computeProgressRef.current(time),
      isPlaying: playing,
    };
  };

  const [snapshot, setSnapshot] = useState<LiveCountdownSnapshot>(() =>
    active
      ? snapshotFromTime(fallbackCurrentTime, false)
      : { displayRemaining: 0, progress: 0, isPlaying: false },
  );

  useEffect(() => {
    if (!active) {
      setSnapshot({ displayRemaining: 0, progress: 0, isPlaying: false });
      return;
    }

    const readSnapshot = (): LiveCountdownSnapshot => {
      const playback = getPlaybackRef.current();
      if (!playback) {
        return snapshotFromTime(fallbackTimeRef.current, false);
      }
      return snapshotFromTime(playback.currentTime, !playback.paused);
    };

    setSnapshot(readSnapshot());

    const intervalId = window.setInterval(() => {
      setSnapshot(readSnapshot());
    }, COUNTDOWN_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [active, resetKey]);

  return snapshot;
}
