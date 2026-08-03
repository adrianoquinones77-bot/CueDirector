import type { Cue } from "./cue";

export interface Song {
  id: string;
  title: string;
  videoUrl: string;
  cues: Cue[];
}
