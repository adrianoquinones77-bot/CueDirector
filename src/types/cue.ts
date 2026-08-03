import type { CueType } from "./cueType";

export interface Cue {
  time: number;
  text: string;
  emoji?: string;
  type?: CueType;
  duration?: number;
}
