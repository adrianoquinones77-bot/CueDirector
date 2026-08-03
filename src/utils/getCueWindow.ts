import type { Cue } from "../types/cue";

export interface CueWindow {
  current?: Cue;
  next?: Cue;
  then?: Cue;
}

export function getCueWindow(cues: Cue[], currentTime: number): CueWindow {
  const currentIndex = cues.findIndex((cue, index) => {
    const nextCue = cues[index + 1];

    if (!nextCue) return currentTime >= cue.time;

    return currentTime >= cue.time && currentTime < nextCue.time;
  });

  return {
    current: cues[currentIndex],
    next: cues[currentIndex + 1],
    then: cues[currentIndex + 2],
  };
}
