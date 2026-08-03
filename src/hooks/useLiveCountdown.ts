import { useEffect, useRef, useState } from "react";

const COUNTDOWN_TICK_MS = 100;
const PLAYBACK_DELTA_THRESHOLD = 0.001;

export interface LiveCountdownSnapshot {
  /** Remaining seconds rounded to one decimal for display. */
  displayRemaining: number;
  progress: number;
  isPlaying: boolean;
}

function extrapolatedTime(
  anchorTime: number,
  anchorAt: number,
  playing: boolean,
): number {
  if (!playing) return anchorTime;
  return anchorTime + (performance.now() - anchorAt) / 1000;
}

function roundToTenth(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.round(seconds * 10) / 10;
}

/**
 * Updates countdown text and bar every 100 ms while playing (one decimal place).
 * Both values share the same remaining-time calculation; CSS animates the bar between ticks.
 */
export function useLiveCountdown(
  computeProgress: (time: number) => number,
  computeRemaining: (time: number) => number,
  currentTime: number,
  active: boolean,
  resetKey: string,
): LiveCountdownSnapshot {
  const computeProgressRef = useRef(computeProgress);
  const computeRemainingRef = useRef(computeRemaining);
  computeProgressRef.current = computeProgress;
  computeRemainingRef.current = computeRemaining;

  const currentTimeRef = useRef(currentTime);
  const lastSyncAtRef = useRef(performance.now());
  const prevCurrentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(false);

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
      ? snapshotFromTime(currentTime, false)
      : { displayRemaining: 0, progress: 0, isPlaying: false },
  );

  useEffect(() => {
    const delta = currentTime - prevCurrentTimeRef.current;
    isPlayingRef.current = Math.abs(delta) > PLAYBACK_DELTA_THRESHOLD;
    currentTimeRef.current = currentTime;
    lastSyncAtRef.current = performance.now();
    prevCurrentTimeRef.current = currentTime;

    if (!isPlayingRef.current) {
      setSnapshot(snapshotFromTime(currentTime, false));
    }
  }, [currentTime]);

  useEffect(() => {
    if (!active) {
      setSnapshot({ displayRemaining: 0, progress: 0, isPlaying: false });
      return;
    }

    currentTimeRef.current = currentTime;
    lastSyncAtRef.current = performance.now();
    prevCurrentTimeRef.current = currentTime;
    isPlayingRef.current = false;
    setSnapshot(snapshotFromTime(currentTime, false));

    const tick = () => {
      if (!isPlayingRef.current) return;

      setSnapshot(
        snapshotFromTime(
          extrapolatedTime(
            currentTimeRef.current,
            lastSyncAtRef.current,
            true,
          ),
          true,
        ),
      );
    };

    tick();
    const intervalId = window.setInterval(tick, COUNTDOWN_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [active, resetKey]);

  return snapshot;
}
