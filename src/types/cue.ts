import type { CueType } from "./cueType";

export interface Cue {
  time: number;
  text: string;
  emoji?: string;
  type?: CueType;
  duration?: number;
  /** Optional show media library id; defaults to the active song video. */
  videoId?: string;
  /** Critical cue highlight for programming and live operation. */
  important?: boolean;
}
