import type { Cue } from "../types/cue";

export const DEFAULT_CUE_DURATION = 2.5;

export function getCueDuration(
  cue: Cue,
  defaultCueDuration: number = DEFAULT_CUE_DURATION,
): number {
  return cue.duration ?? defaultCueDuration;
}

export function getCueEndTime(
  cue: Cue,
  defaultCueDuration: number = DEFAULT_CUE_DURATION,
): number {
  return cue.time + getCueDuration(cue, defaultCueDuration);
}

export function isCueActive(
  cue: Cue,
  currentTime: number,
  defaultCueDuration: number = DEFAULT_CUE_DURATION,
): boolean {
  return (
    currentTime >= cue.time &&
    currentTime < getCueEndTime(cue, defaultCueDuration)
  );
}

export function getLivePeriodStart(
  cues: Cue[],
  currentTime: number,
  defaultCueDuration: number = DEFAULT_CUE_DURATION,
): number {
  let start = 0;

  for (const cue of cues) {
    const end = getCueEndTime(cue, defaultCueDuration);
    if (currentTime >= end && end > start) {
      start = end;
    }
  }

  return start;
}
