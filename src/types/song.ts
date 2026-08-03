import type { Cue } from "./cue";

export interface Song {
  id: string;
  title: string;
  videoFilename: string;
  videoUrl: string;
  cues: Cue[];
}
