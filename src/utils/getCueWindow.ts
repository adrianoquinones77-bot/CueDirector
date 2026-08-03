import type { Cue } from "../types/cue";
import { isCueActive } from "./cueTiming";

export interface CueWindow {
  current?: Cue;
  next?: Cue;
  then?: Cue;
}

export function getCueWindow(
  cues: Cue[],
  currentTime: number,
  defaultCueDuration: number,
): CueWindow {
  const currentIndex = cues.findIndex((cue) =>
    isCueActive(cue, currentTime, defaultCueDuration),
  );
  const current = currentIndex >= 0 ? cues[currentIndex] : undefined;

  const next = current
    ? cues[currentIndex + 1]
    : cues.find((cue) => cue.time > currentTime);

  const nextIndex = next ? cues.indexOf(next) : -1;
  const then = nextIndex >= 0 ? cues[nextIndex + 1] : undefined;

  return { current, next, then };
}
